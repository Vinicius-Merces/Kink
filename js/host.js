// Painel do Professor - Gerenciamento de sala ao vivo (VERSÃO FINAL - Ranking com Distribuição)
class HostManager {
    constructor() {
        this.roomId = null;
        this.room = null;
        this.quiz = null;
        this.currentQuestionIndex = 0;
        this.readingTimer = null;
        this.answerTimer = null;
        this.playersUnsubscribe = null;
        this.rankingUnsubscribe = null;
        this.roomUnsubscribe = null;
        this.answersUnsubscribe = null;
        this.isProcessing = false;
        this.isFinishing = false;
        this.totalPlayers = 0;
        this.answeredPlayers = new Set();
        this.init();
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('room');
        if (!this.roomId) {
            Utils.showToast('Sala não encontrada', 'error');
            setTimeout(() => window.location.href = 'my-quizzes.html', 2000);
            return;
        }

        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            await this.loadRoom();
            this.setupListeners();
            this.updateUI();
        });
    }

    async loadRoom() {
        try {
            const roomDoc = await db.collection('rooms').doc(this.roomId).get();
            if (!roomDoc.exists) {
                Utils.showToast('Sala não encontrada', 'error');
                window.location.href = 'my-quizzes.html';
                return;
            }
            this.room = { id: roomDoc.id, ...roomDoc.data() };
            if (this.room.creatorId !== auth.currentUser.uid) {
                Utils.showToast('Você não é o criador desta sala', 'error');
                window.location.href = 'my-quizzes.html';
                return;
            }

            this.quiz = {
                id: this.room.quizId,
                title: this.room.quizTitle,
                questions: this.room.questions || []
            };
            this.currentQuestionIndex = this.room.currentQuestionIndex || 0;
            this.updateUI();
        } catch (error) {
            Utils.showToast('Erro ao carregar sala', 'error');
        }
    }

    setupListeners() {
        this.roomUnsubscribe = db.collection('rooms').doc(this.roomId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    this.room = { id: doc.id, ...doc.data() };
                    this.updateRoomStatus();
                }
            });

        this.playersUnsubscribe = db.collection(`rooms/${this.roomId}/players`)
            .onSnapshot((snapshot) => {
                const players = [];
                snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
                this.totalPlayers = players.length;
                this.updatePlayersList(players);
            });

        this.rankingUnsubscribe = db.collection(`rooms/${this.roomId}/scores`)
            .orderBy('totalScore', 'desc')
            .onSnapshot((snapshot) => {
                const rankings = [];
                snapshot.forEach(doc => rankings.push({ id: doc.id, ...doc.data() }));
                this.updateRanking(rankings);
            });

        this.answersUnsubscribe = db.collection(`rooms/${this.roomId}/answers`)
            .onSnapshot((snapshot) => {
                if (this.room.status === 'answering' && !this.isFinishing) {
                    const answers = [];
                    snapshot.forEach(doc => {
                        if (doc.data().questionIndex === this.currentQuestionIndex) {
                            answers.push(doc.data());
                        }
                    });
                    this.answeredPlayers = new Set(answers.map(a => a.playerId));
                    if (this.answeredPlayers.size === this.totalPlayers && this.totalPlayers > 0) {
                        console.log(`🎉 Todos os ${this.totalPlayers} jogadores responderam!`);
                        this.finishQuestion();
                    }
                    this.updateAnsweredCount();
                }
            });
    }

    updateUI() {
        const roomCodeElem = document.getElementById('roomCode');
        if (roomCodeElem) roomCodeElem.textContent = this.room.code;

        const quizInfoElem = document.getElementById('quizInfo');
        if (quizInfoElem) quizInfoElem.innerHTML = `<strong>Quiz:</strong> ${this.room.quizTitle} | <strong>Perguntas:</strong> ${this.room.questions?.length || 0}`;

        const copyBtn = document.getElementById('copyCodeBtn');
        if (copyBtn) copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(this.room.code);
            Utils.showToast('Código copiado!', 'success');
        });

        const shareBtn = document.getElementById('shareRoomBtn');
        if (shareBtn) shareBtn.addEventListener('click', () => {
            const url = `${window.location.origin}/player.html?code=${this.room.code}`;
            navigator.clipboard.writeText(url);
            Utils.showToast('Link copiado!', 'success');
        });

        const startGameBtn = document.getElementById('startGameBtn');
        const startQuestionBtn = document.getElementById('startQuestionBtn');
        const nextQuestionBtn = document.getElementById('nextQuestionBtn');
        const endGameBtn = document.getElementById('endGameBtn');

        if (startGameBtn) startGameBtn.addEventListener('click', () => this.startGame());
        if (startQuestionBtn) startQuestionBtn.addEventListener('click', () => this.startCurrentQuestion());
        if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', () => this.nextQuestion());
        if (endGameBtn) endGameBtn.addEventListener('click', () => this.endGame());
    }

    updateRoomStatus() {
        const questionControls = document.getElementById('questionControls');
        const startGameBtn = document.getElementById('startGameBtn');

        if (this.room.status === 'waiting') {
            startGameBtn.style.display = 'block';
            questionControls.style.display = 'none';
        } else if (this.room.status === 'active') {
            startGameBtn.style.display = 'none';
            questionControls.style.display = 'block';
            this.updateCurrentQuestionDisplay();
        } else if (this.room.status === 'loading') {
            this.showLoadingScreen();
        } else if (this.room.status === 'reading') {
            this.updateReadingPhase();
        } else if (this.room.status === 'answering') {
            this.updateAnsweringPhase();
        }
    }

    showLoadingScreen() {
        const display = document.getElementById('currentQuestionDisplay');
        display.innerHTML = `
            <div class="current-question" style="background: rgba(78, 205, 196, 0.2);">
                <strong>🔄 Carregando Quiz...</strong>
                <div class="loading-spinner" style="margin: 1rem auto;">
                    <div class="spinner"></div>
                </div>
                <p>Preparando perguntas e sistema...</p>
                <small id="loadingTimer">5</small>s
            </div>
        `;

        let timeLeft = 5;
        const timerSpan = document.getElementById('loadingTimer');
        const loadingInterval = setInterval(() => {
            timeLeft--;
            if (timerSpan) timerSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(loadingInterval);
                db.collection('rooms').doc(this.roomId).update({ status: 'active' });
            }
        }, 1000);
    }

    updateCurrentQuestionDisplay() {
        const display = document.getElementById('currentQuestionDisplay');
        const questions = this.room.questions || [];
        if (this.currentQuestionIndex < questions.length) {
            const question = questions[this.currentQuestionIndex];
            display.innerHTML = `<div class="current-question"><strong>Pergunta ${this.currentQuestionIndex + 1}/${questions.length}</strong><p>${Utils.escapeHtml(question.text)}</p><small>Tempo limite: ${question.timeLimit || 30}s</small></div>`;
        } else {
            display.innerHTML = '<p class="placeholder">Quiz finalizado!</p>';
        }
    }

    async startGame() {
        if (this.room.status !== 'waiting') return;

        console.log('🎮 Iniciando quiz - tela de carregamento por 5s...');

        await db.collection('rooms').doc(this.roomId).update({ 
            status: 'loading', 
            currentQuestionIndex: 0 
        });

        Utils.showToast('Carregando quiz...', 'info');

        await new Promise(resolve => setTimeout(resolve, 5000));

        await db.collection('rooms').doc(this.roomId).update({ status: 'active' });

        Utils.showToast('Quiz carregado! Clique em "Iniciar Pergunta" para começar', 'success');
    }

    async startCurrentQuestion() {
        if (this.isProcessing) return;
        if (this.currentQuestionIndex >= this.quiz.questions.length) {
            this.endGame();
            return;
        }

        this.isProcessing = true;
        this.answeredPlayers.clear();

        const currentQuestion = this.quiz.questions[this.currentQuestionIndex];
        const timeLimit = currentQuestion.timeLimit || 30;

        console.log(`\n🎯 ========== PERGUNTA ${this.currentQuestionIndex + 1} ==========`);
        console.log(`   ${currentQuestion.text}`);

        await db.collection('rooms').doc(this.roomId).update({
            status: 'reading',
            currentQuestionData: {
                text: currentQuestion.text,
                options: currentQuestion.options,
                timeLimit: timeLimit,
                correct: currentQuestion.correct,
                readingTime: 5
            },
            currentQuestionIndex: this.currentQuestionIndex
        });

        await new Promise(resolve => setTimeout(resolve, 5000));

        await db.collection('rooms').doc(this.roomId).update({
            status: 'answering',
            currentQuestionStartTime: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.isProcessing = false;
    }

    updateReadingPhase() {
        const display = document.getElementById('currentQuestionDisplay');
        const questions = this.room.questions || [];
        const question = questions[this.currentQuestionIndex];
        if (!question) return;
        display.innerHTML = `
            <div class="current-question" style="background: rgba(78, 205, 196, 0.2);">
                <strong>📖 Leia a pergunta (5s)</strong>
                <p style="font-size: 1.2rem; margin-top: 1rem;">${Utils.escapeHtml(question.text)}</p>
                <small>As opções aparecerão em breve...</small>
            </div>
        `;
        document.getElementById('questionTimer').style.display = 'none';
    }

    updateAnsweringPhase() {
        const display = document.getElementById('currentQuestionDisplay');
        const questions = this.room.questions || [];
        const question = questions[this.currentQuestionIndex];
        if (!question) return;
        display.innerHTML = `
            <div class="current-question">
                <strong>⚡ Responda agora!</strong>
                <p>${Utils.escapeHtml(question.text)}</p>
                <small>Tempo limite: ${question.timeLimit || 30}s</small>
                <div style="margin-top: 0.5rem; font-size: 0.8rem;">
                    Respondidos: <span id="answeredCount">0</span>/${this.totalPlayers}
                </div>
            </div>
        `;
        this.startTimer(question.timeLimit || 30);
        this.updateAnsweredCount();
    }

    updateAnsweredCount() {
        const countSpan = document.getElementById('answeredCount');
        if (countSpan) countSpan.textContent = this.answeredPlayers.size;
    }

    startTimer(limit = 30) {
        const timerDisplay = document.getElementById('questionTimer');
        const timerSeconds = document.getElementById('timerSeconds');
        const timerBar = document.querySelector('.timer-bar');
        timerDisplay.style.display = 'block';
        let timeLeft = limit;
        timerSeconds.textContent = timeLeft;
        if (timerBar) timerBar.style.width = '100%';

        if (this.answerTimer) clearInterval(this.answerTimer);

        this.answerTimer = setInterval(() => {
            timeLeft--;
            timerSeconds.textContent = Math.max(0, timeLeft);
            if (timerBar) timerBar.style.width = `${Math.max(0, (timeLeft / limit) * 100)}%`;
            if (timeLeft <= 0) clearInterval(this.answerTimer);
        }, 1000);
    }

    async finishQuestion() {
        if (this.isFinishing) return;
        this.isFinishing = true;

        if (this.readingTimer) clearTimeout(this.readingTimer);
        if (this.answerTimer) clearInterval(this.answerTimer);

        const question = this.quiz.questions[this.currentQuestionIndex];
        if (!question) {
            this.isFinishing = false;
            return;
        }

        console.log(`\n🏁 ========== FINALIZANDO PERGUNTA ${this.currentQuestionIndex + 1} ==========`);

        const answersSnapshot = await db.collection(`rooms/${this.roomId}/answers`)
            .where('questionIndex', '==', this.currentQuestionIndex)
            .get();

        const answers = [];
        answersSnapshot.forEach(doc => answers.push({ id: doc.id, ...doc.data() }));

        console.log(`   Total de respostas: ${answers.length}`);

        let correctCount = 0;
        const timeLimit = question.timeLimit || 30;

        for (const answer of answers) {
            const isCorrect = (answer.answer === question.correct);
            let points = 0;

            if (isCorrect && answer.responseTime !== undefined) {
                const responseTime = Math.min(answer.responseTime, timeLimit);
                const timeRemaining = Math.max(0, timeLimit - responseTime);
                points = Math.floor(1000 * (timeRemaining / timeLimit));
                points = Math.min(1000, Math.max(0, points));
                correctCount++;
                console.log(`   ✅ ${answer.playerName}: ACERTOU! Tempo: ${responseTime.toFixed(2)}s -> ${points} pts`);
            } else {
                console.log(`   ❌ ${answer.playerName}: ERROU! 0 pts`);
            }

            await db.collection(`rooms/${this.roomId}/answers`).doc(answer.id).update({
                points: points,
                isCorrect: isCorrect,
                calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const playerScoreRef = db.collection(`rooms/${this.roomId}/scores`).doc(answer.playerId);
            const playerScoreDoc = await playerScoreRef.get();
            const currentScore = playerScoreDoc.exists ? (playerScoreDoc.data().totalScore || 0) : 0;

            await playerScoreRef.set({
                playerId: answer.playerId,
                playerName: answer.playerName,
                avatar: answer.avatar,
                totalScore: currentScore + points,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        const totalAnswers = answers.length;
        const accuracy = totalAnswers > 0 ? (correctCount / totalAnswers * 100).toFixed(1) : 0;

        document.getElementById('answersCount').textContent = totalAnswers;
        document.getElementById('accuracyRate').textContent = `${accuracy}%`;

        console.log(`\n📊 ESTATÍSTICAS: ${correctCount}/${totalAnswers} acertos (${accuracy}%)`);

        // Ranking com distribuição incluída
        await this.showRankingModalWithDistribution(question);

        await db.collection('rooms').doc(this.roomId).update({ status: 'active' });

        document.getElementById('questionTimer').style.display = 'none';
        document.getElementById('startQuestionBtn').style.display = 'block';
        document.getElementById('nextQuestionBtn').style.display = 'none';

        Utils.showToast(`Pergunta finalizada! ${correctCount}/${totalAnswers} acertos`, 'info');

        this.isFinishing = false;
        this.isProcessing = false;
    }

    // Ranking + Distribuição no mesmo modal
    async showRankingModalWithDistribution(question) {
        const scoresSnapshot = await db.collection(`rooms/${this.roomId}/scores`)
            .orderBy('totalScore', 'desc')
            .limit(8)
            .get();

        const rankings = [];
        scoresSnapshot.forEach(doc => rankings.push(doc.data()));

        const answersSnapshot = await db.collection(`rooms/${this.roomId}/answers`)
            .where('questionIndex', '==', this.currentQuestionIndex)
            .get();

        const choiceCount = new Array(question.options.length).fill(0);
        answersSnapshot.forEach(doc => {
            const a = doc.data();
            if (a.answer >= 0 && a.answer < question.options.length) {
                choiceCount[a.answer]++;
            }
        });

        let distributionHTML = `<h3 style="margin:1rem 0 0.5rem;color:#ff6b6b;">Distribuição de Respostas</h3>`;
        question.options.forEach((opt, i) => {
            const count = choiceCount[i];
            const perc = answersSnapshot.size > 0 ? Math.round((count / answersSnapshot.size) * 100) : 0;
            const isCorrect = i === question.correct;
            distributionHTML += `
                <div style="margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span><strong>${String.fromCharCode(65+i)}.</strong> ${Utils.escapeHtml(opt)}</span>
                        <span>${count} (${perc}%)</span>
                    </div>
                    <div style="background:#333;height:22px;border-radius:6px;overflow:hidden;">
                        <div style="background:${isCorrect ? '#48bb78' : '#ff6b6b'};width:${perc}%;height:100%;"></div>
                    </div>
                </div>`;
        });

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:580px;">
                <h2 style="color:#ff6b6b;margin-bottom:1rem;">🏆 Ranking Parcial 🏆</h2>
                <div style="margin:1rem 0;">
                    ${rankings.map((p,i) => `
                        <div style="display:flex;justify-content:space-between;padding:0.8rem;border-bottom:1px solid rgba(255,255,255,0.1);">
                            <span style="font-weight:bold;">${i+1}º</span>
                            <span>${Utils.getAvatarEmoji(p.avatar)} ${Utils.escapeHtml(p.playerName)}</span>
                            <span style="color:#ff6b6b;font-weight:bold;">${p.totalScore||0} pts</span>
                        </div>
                    `).join('')}
                </div>
                ${distributionHTML}
                <button id="continueBtn" class="btn btn-primary btn-large" style="margin-top:1.5rem;width:100%;">
                    ➡️ Próxima Pergunta
                </button>
            </div>`;

        document.body.appendChild(modal);

        modal.querySelector('#continueBtn').addEventListener('click', () => {
            modal.remove();
            this.nextQuestion();
        });
    }

    async nextQuestion() {
        const nextIndex = this.currentQuestionIndex + 1;
        const questions = this.room.questions || [];
        if (nextIndex >= questions.length) {
            this.endGame();
            return;
        }

        this.currentQuestionIndex = nextIndex;

        await db.collection('rooms').doc(this.roomId).update({ 
            currentQuestionIndex: nextIndex, 
            status: 'active' 
        });

        document.getElementById('startQuestionBtn').style.display = 'block';
        document.getElementById('nextQuestionBtn').style.display = 'none';
        this.updateCurrentQuestionDisplay();

        Utils.showToast(`Preparando pergunta ${nextIndex + 1}...`, 'info');
    }

    async endGame() {
        await db.collection('rooms').doc(this.roomId).update({ 
            status: 'finished', 
            active: false, 
            endedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });

        console.log(`\n🏆 QUIZ FINALIZADO! 🏆`);
        await this.showFinalRanking();

        document.getElementById('startQuestionBtn').style.display = 'none';
        document.getElementById('nextQuestionBtn').style.display = 'none';
        document.getElementById('startGameBtn').style.display = 'none';
        Utils.showToast('Quiz finalizado!', 'success');
    }

    async showFinalRanking() {
        const scoresSnapshot = await db.collection(`rooms/${this.roomId}/scores`)
            .orderBy('totalScore', 'desc')
            .limit(10)
            .get();

        const rankings = [];
        scoresSnapshot.forEach(doc => rankings.push(doc.data()));

        let podiumHTML = `<h2 style="color:#ff6b6b;">🏆 Pódio Final 🏆</h2>`;
        if (rankings.length >= 1) podiumHTML += `<div style="font-size:2rem;margin:1rem 0;">🥇 ${Utils.getAvatarEmoji(rankings[0].avatar)} ${rankings[0].playerName} — ${rankings[0].totalScore} pts</div>`;
        if (rankings.length >= 2) podiumHTML += `<div style="font-size:1.6rem;margin:0.5rem 0;">🥈 ${Utils.getAvatarEmoji(rankings[1].avatar)} ${rankings[1].playerName} — ${rankings[1].totalScore} pts</div>`;
        if (rankings.length >= 3) podiumHTML += `<div style="font-size:1.4rem;margin:0.5rem 0;">🥉 ${Utils.getAvatarEmoji(rankings[2].avatar)} ${rankings[2].playerName} — ${rankings[2].totalScore} pts</div>`;

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px; text-align: center;">
                    ${podiumHTML}
                    <div style="margin: 2rem 0; max-height: 400px; overflow-y: auto; text-align: left;">
                        ${rankings.map((player, index) => `
                            <div style="display: flex; justify-content: space-between; padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <span style="font-weight: bold;">${index + 1}º</span>
                                <span>${Utils.getAvatarEmoji(player.avatar)} ${Utils.escapeHtml(player.playerName)}</span>
                                <span style="color: #ff6b6b; font-weight: bold;">${player.totalScore || 0} pts</span>
                            </div>
                        `).join('')}
                    </div>
                    <button id="closeFinalBtn" class="btn btn-primary btn-large">Fechar</button>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('#closeFinalBtn').addEventListener('click', () => {
                modal.remove();
                resolve();
            });
        });
    }

    updatePlayersList(players) {
        const list = document.getElementById('playersList');
        const count = document.getElementById('playersCount');
        if (!list) return;
        if (players.length === 0) {
            list.innerHTML = '<p class="placeholder">Aguardando jogadores...</p>';
            count.textContent = '0';
            return;
        }
        list.innerHTML = players.map(player => `
            <div class="player-item">
                <div class="player-info">
                    <span class="player-avatar">${Utils.getAvatarEmoji(player.avatar)}</span>
                    <span>${Utils.escapeHtml(player.name)}</span>
                </div>
            </div>
        `).join('');
        count.textContent = players.length;
    }

    updateRanking(rankings) {
        const list = document.getElementById('rankingList');
        if (!list) return;
        if (rankings.length === 0) {
            list.innerHTML = '<p class="placeholder">Aguardando respostas...</p>';
            return;
        }
        list.innerHTML = rankings.slice(0, 10).map((player, index) => `
            <div class="ranking-item">
                <div class="ranking-position">${index + 1}º</div>
                <div class="player-info">
                    <span class="player-avatar">${Utils.getAvatarEmoji(player.avatar)}</span>
                    <span>${Utils.escapeHtml(player.playerName)}</span>
                </div>
                <div class="ranking-score">${player.totalScore || 0} pts</div>
            </div>
        `).join('');
    }

    cleanup() {
        if (this.playersUnsubscribe) this.playersUnsubscribe();
        if (this.rankingUnsubscribe) this.rankingUnsubscribe();
        if (this.roomUnsubscribe) this.roomUnsubscribe();
        if (this.answersUnsubscribe) this.answersUnsubscribe();
        if (this.readingTimer) clearTimeout(this.readingTimer);
        if (this.answerTimer) clearInterval(this.answerTimer);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.hostManager = new HostManager();
    window.addEventListener('beforeunload', () => { if (window.hostManager) window.hostManager.cleanup(); });
});