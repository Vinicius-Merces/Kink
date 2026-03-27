const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ============================================
// 1. FUNÇÃO: CALCULAR PONTUAÇÃO DA RESPOSTA
// ============================================
// Executa automaticamente quando uma resposta é criada
exports.calculateScore = functions.firestore
    .document('rooms/{roomId}/answers/{answerId}')
    .onCreate(async (snap, context) => {
        const { roomId, answerId } = context.params;
        const answerData = snap.data();
        
        console.log(`📝 Nova resposta recebida na sala ${roomId}`);
        console.log(`   Jogador: ${answerData.playerName}`);
        console.log(`   Pergunta: ${answerData.questionIndex}`);
        
        try {
            // 1. Buscar informações da sala
            const roomDoc = await db.collection('rooms').doc(roomId).get();
            if (!roomDoc.exists) {
                console.log('❌ Sala não encontrada');
                return null;
            }
            
            const room = roomDoc.data();
            
            // 2. Buscar o quiz para obter a resposta correta
            const quizDoc = await db.collection('quizzes').doc(room.quizId).get();
            if (!quizDoc.exists) {
                console.log('❌ Quiz não encontrado');
                return null;
            }
            
            const quiz = quizDoc.data();
            const question = quiz.questions[answerData.questionIndex];
            
            if (!question) {
                console.log('❌ Pergunta não encontrada');
                return null;
            }
            
            // 3. Calcular pontuação
            const isCorrect = (answerData.answer === question.correct);
            let points = 0;
            
            if (isCorrect) {
                const timeLimit = question.timeLimit || 30;
                const responseTime = answerData.responseTime || timeLimit;
                // Fórmula: quanto mais rápido, mais pontos (máximo 1000)
                const speedBonus = Math.max(0, (timeLimit - responseTime) / timeLimit);
                points = Math.floor(1000 * speedBonus);
                
                // Garantir que pontos não sejam negativos
                points = Math.max(0, Math.min(1000, points));
                
                console.log(`✅ Resposta correta! ${points} pontos (tempo: ${responseTime}s)`);
            } else {
                console.log(`❌ Resposta errada! 0 pontos`);
            }
            
            // 4. Atualizar o documento da resposta com os pontos
            await snap.ref.update({
                points: points,
                isCorrect: isCorrect,
                calculatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // 5. Atualizar pontuação do jogador
            const scoreRef = db.collection('rooms').doc(roomId)
                .collection('scores').doc(answerData.playerId);
            
            const scoreDoc = await scoreRef.get();
            const currentScore = scoreDoc.exists ? scoreDoc.data().totalScore || 0 : 0;
            const newScore = currentScore + points;
            
            // Atualizar ou criar documento de pontuação
            await scoreRef.set({
                playerId: answerData.playerId,
                playerName: answerData.playerName,
                avatar: answerData.avatar,
                totalScore: newScore,
                [`answers.q${answerData.questionIndex}`]: {
                    points: points,
                    correct: isCorrect,
                    time: answerData.responseTime,
                    answer: answerData.answer
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log(`🏆 Nova pontuação para ${answerData.playerName}: ${newScore} pontos`);
            
            return { success: true, points: points };
            
        } catch (error) {
            console.error('❌ Erro ao calcular pontuação:', error);
            return null;
        }
    });

// ============================================
// 2. FUNÇÃO: FINALIZAR PERGUNTA AUTOMATICAMENTE
// ============================================
// Executa quando o timer da pergunta expira
exports.autoFinishQuestion = functions.firestore
    .document('rooms/{roomId}')
    .onUpdate(async (change, context) => {
        const { roomId } = context.params;
        const before = change.before.data();
        const after = change.after.data();
        
        // Verificar se a pergunta foi iniciada e ainda está ativa
        if (after.status === 'question_active' && 
            before.status !== 'question_active') {
            
            const timeLimit = after.currentQuestionData?.timeLimit || 30;
            
            console.log(`⏰ Timer iniciado para pergunta ${after.currentQuestionIndex} na sala ${roomId}`);
            console.log(`   Tempo limite: ${timeLimit} segundos`);
            
            // Aguardar o tempo limite
            await new Promise(resolve => setTimeout(resolve, timeLimit * 1000));
            
            // Verificar se ainda está ativa (não foi finalizada manualmente)
            const roomNow = await db.collection('rooms').doc(roomId).get();
            const roomData = roomNow.data();
            
            if (roomData.status === 'question_active') {
                console.log(`⏰ Tempo esgotado! Finalizando pergunta ${roomData.currentQuestionIndex}`);
                
                // Finalizar a pergunta
                await db.collection('rooms').doc(roomId).update({
                    status: 'active'
                });
                
                // Calcular estatísticas da pergunta
                const answersSnapshot = await db.collection('rooms')
                    .doc(roomId)
                    .collection('answers')
                    .where('questionIndex', '==', roomData.currentQuestionIndex)
                    .get();
                
                const totalAnswers = answersSnapshot.size;
                let correctAnswers = 0;
                
                answersSnapshot.forEach(doc => {
                    if (doc.data().isCorrect) correctAnswers++;
                });
                
                console.log(`📊 Estatísticas da pergunta:`);
                console.log(`   Total respostas: ${totalAnswers}`);
                console.log(`   Acertos: ${correctAnswers}`);
                console.log(`   Taxa de acerto: ${totalAnswers > 0 ? (correctAnswers/totalAnswers*100).toFixed(1) : 0}%`);
            }
        }
        
        return null;
    });

// ============================================
// 3. FUNÇÃO: LIMPAR SALAS ANTIGAS
// ============================================
// Executa a cada 24h para limpar salas com mais de 24h
exports.cleanOldRooms = functions.pubsub
    .schedule('0 0 * * *') // Executa todos os dias à meia-noite
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        console.log('🧹 Iniciando limpeza de salas antigas...');
        
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - 24);
        
        try {
            // Buscar salas com mais de 24h
            const roomsSnapshot = await db.collection('rooms')
                .where('createdAt', '<', cutoffDate)
                .where('active', '==', false)
                .get();
            
            let deletedCount = 0;
            
            for (const roomDoc of roomsSnapshot.docs) {
                const roomId = roomDoc.id;
                console.log(`🗑️ Removendo sala antiga: ${roomId}`);
                
                // Remover subcoleções
                const players = await db.collection('rooms').doc(roomId).collection('players').get();
                const answers = await db.collection('rooms').doc(roomId).collection('answers').get();
                const scores = await db.collection('rooms').doc(roomId).collection('scores').get();
                
                // Deletar em lote
                const batch = db.batch();
                
                players.forEach(doc => batch.delete(doc.ref));
                answers.forEach(doc => batch.delete(doc.ref));
                scores.forEach(doc => batch.delete(doc.ref));
                batch.delete(roomDoc.ref);
                
                await batch.commit();
                deletedCount++;
            }
            
            console.log(`✅ Limpeza concluída! ${deletedCount} salas removidas.`);
            
        } catch (error) {
            console.error('❌ Erro na limpeza:', error);
        }
        
        return null;
    });

// ============================================
// 4. FUNÇÃO: ATUALIZAR RANKING AO VIVO
// ============================================
// Notifica todos os jogadores quando o ranking muda
exports.onScoreUpdate = functions.firestore
    .document('rooms/{roomId}/scores/{playerId}')
    .onWrite(async (change, context) => {
        const { roomId } = context.params;
        
        // Buscar todos os scores da sala
        const scoresSnapshot = await db.collection('rooms')
            .doc(roomId)
            .collection('scores')
            .orderBy('totalScore', 'desc')
            .limit(10)
            .get();
        
        const ranking = [];
        scoresSnapshot.forEach(doc => {
            ranking.push({
                playerId: doc.id,
                playerName: doc.data().playerName,
                avatar: doc.data().avatar,
                totalScore: doc.data().totalScore
            });
        });
        
        // Atualizar o documento de ranking da sala
        await db.collection('rooms').doc(roomId).update({
            ranking: ranking,
            lastRankingUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`📊 Ranking atualizado na sala ${roomId}`);
        
        return null;
    });

// ============================================
// 5. FUNÇÃO: VALIDAR RESPOSTAS DUPLICADAS
// ============================================
// Impede que o mesmo jogador responda duas vezes à mesma pergunta
exports.preventDuplicateAnswers = functions.firestore
    .document('rooms/{roomId}/answers/{answerId}')
    .onCreate(async (snap, context) => {
        const { roomId } = context.params;
        const answerData = snap.data();
        
        // Verificar se já existe resposta deste jogador para esta pergunta
        const existingAnswers = await db.collection('rooms')
            .doc(roomId)
            .collection('answers')
            .where('playerId', '==', answerData.playerId)
            .where('questionIndex', '==', answerData.questionIndex)
            .get();
        
        if (existingAnswers.size > 1) {
            // Mais de uma resposta - deletar a mais recente
            console.log(`⚠️ Resposta duplicada detectada para ${answerData.playerName}`);
            
            // Manter a primeira resposta, deletar as demais
            const answers = existingAnswers.docs;
            answers.sort((a, b) => {
                const aTime = a.data().timestamp?.toDate() || new Date(0);
                const bTime = b.data().timestamp?.toDate() || new Date(0);
                return aTime - bTime;
            });
            
            // Manter a primeira, deletar as outras
            for (let i = 1; i < answers.length; i++) {
                await answers[i].ref.delete();
                console.log(`🗑️ Resposta duplicada removida`);
            }
        }
        
        return null;
    });

// ============================================
// 6. FUNÇÃO: GERAR RELATÓRIO DO QUIZ
// ============================================
// Gera um relatório detalhado quando o quiz termina
exports.generateQuizReport = functions.firestore
    .document('rooms/{roomId}')
    .onUpdate(async (change, context) => {
        const { roomId } = context.params;
        const after = change.after.data();
        const before = change.before.data();
        
        // Verificar se o quiz foi finalizado
        if (after.status === 'finished' && before.status !== 'finished') {
            console.log(`📊 Gerando relatório para sala ${roomId}`);
            
            try {
                // Buscar todos os scores
                const scoresSnapshot = await db.collection('rooms')
                    .doc(roomId)
                    .collection('scores')
                    .orderBy('totalScore', 'desc')
                    .get();
                
                const players = [];
                scoresSnapshot.forEach(doc => {
                    players.push({
                        playerId: doc.id,
                        playerName: doc.data().playerName,
                        totalScore: doc.data().totalScore,
                        answers: doc.data().answers
                    });
                });
                
                // Buscar o quiz
                const quizDoc = await db.collection('quizzes').doc(after.quizId).get();
                const quiz = quizDoc.data();
                
                // Calcular estatísticas gerais
                const totalPlayers = players.length;
                const averageScore = players.reduce((sum, p) => sum + p.totalScore, 0) / totalPlayers;
                const highestScore = players.length > 0 ? players[0].totalScore : 0;
                
                // Criar relatório
                const report = {
                    roomId: roomId,
                    quizTitle: quiz.title,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    totalPlayers: totalPlayers,
                    averageScore: averageScore,
                    highestScore: highestScore,
                    players: players,
                    questions: quiz.questions.map((q, idx) => {
                        // Calcular acertos por pergunta
                        const correctCount = players.filter(p => 
                            p.answers && p.answers[`q${idx}`] && p.answers[`q${idx}`].correct
                        ).length;
                        
                        return {
                            text: q.text,
                            correctAnswer: q.options[q.correct],
                            totalCorrect: correctCount,
                            correctRate: (correctCount / totalPlayers * 100).toFixed(1)
                        };
                    })
                };
                
                // Salvar relatório
                await db.collection('reports').doc(roomId).set(report);
                
                console.log(`✅ Relatório gerado com sucesso!`);
                console.log(`   Total de jogadores: ${totalPlayers}`);
                console.log(`   Pontuação média: ${averageScore.toFixed(0)}`);
                
            } catch (error) {
                console.error('❌ Erro ao gerar relatório:', error);
            }
        }
        
        return null;
    });

// ============================================
// 7. FUNÇÃO: WEBHOOK PARA NOTIFICAÇÕES (OPCIONAL)
// ============================================
// Envia notificação quando um quiz atinge 10 jogadores
exports.notifyHighParticipation = functions.firestore
    .document('rooms/{roomId}/players/{playerId}')
    .onCreate(async (snap, context) => {
        const { roomId } = context.params;
        
        // Contar número de jogadores
        const playersSnapshot = await db.collection('rooms')
            .doc(roomId)
            .collection('players')
            .get();
        
        const playerCount = playersSnapshot.size;
        
        if (playerCount === 10) {
            console.log(`🎉 Sala ${roomId} atingiu 10 jogadores!`);
            
            // Buscar informações da sala
            const roomDoc = await db.collection('rooms').doc(roomId).get();
            const room = roomDoc.data();
            
            // Buscar criador da sala
            const creatorDoc = await db.collection('users').doc(room.creatorId).get();
            const creator = creatorDoc.data();
            
            console.log(`   Professor: ${creator?.name || room.creatorId}`);
            console.log(`   Quiz: ${room.quizTitle}`);
            console.log(`   Total jogadores: ${playerCount}`);
            
            // Aqui você pode adicionar integrações como:
            // - Enviar email para o professor
            // - Enviar notificação push
            // - Registrar em analytics
        }
        
        return null;
    });

// ============================================
// 8. FUNÇÃO: BACKUP AUTOMÁTICO (OPCIONAL)
// ============================================
// Faz backup de quizzes importantes a cada semana
exports.backupImportantQuizzes = functions.pubsub
    .schedule('0 0 * * 0') // Executa todo domingo à meia-noite
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        console.log('💾 Iniciando backup de quizzes...');
        
        try {
            // Buscar quizzes com mais de 50 jogadas
            const quizzesSnapshot = await db.collection('quizzes')
                .where('timesPlayed', '>=', 50)
                .get();
            
            const backups = [];
            
            for (const doc of quizzesSnapshot.docs) {
                backups.push({
                    quizId: doc.id,
                    quizData: doc.data(),
                    backedUpAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Salvar backup
            await db.collection('backups').doc(`backup_${Date.now()}`).set({
                quizzes: backups,
                totalQuizzes: backups.length,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Backup concluído! ${backups.length} quizzes salvos.`);
            
        } catch (error) {
            console.error('❌ Erro no backup:', error);
        }
        
        return null;
    });