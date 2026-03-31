// Gerenciador de Quizzes - CRUD completo - VERSÃO 2
class QuizManager {
    constructor() {
        this.currentUser = null;
        this.currentQuiz = null;
        this.questions = [];
        this.setupAuthListener();
    }

    setupAuthListener() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            console.log('🔐 Auth state changed (v2):', user ? user.displayName : 'null');
            if (user && window.location.pathname.includes('my-quizzes.html')) {
                console.log('📋 Usuário logado, carregando quizzes...');
                this.loadUserQuizzes();
            }
        });
    }

    async loadUserQuizzes() {
        if (!this.currentUser) {
            console.log('⚠️ Nenhum usuário logado');
            return [];
        }
        
        try {
            console.log('🔍 Buscando quizzes para UID:', this.currentUser.uid);
            const snapshot = await db.collection('quizzes')
                .where('creatorId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            console.log('📊 Total de quizzes encontrados:', snapshot.size);
            
            const quizzes = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log('📄 Quiz carregado:', doc.id, '->', data.title);
                quizzes.push({ id: doc.id, ...data });
            });
            
            console.log('📦 Quizzes processados:', quizzes.length);
            this.renderQuizzesList(quizzes);
            this.updateStats(quizzes);
            return quizzes;
        } catch (error) {
            console.error('❌ Erro ao carregar quizzes:', error);
            console.error('Detalhes:', error.code, error.message);
            Utils.showToast('Erro ao carregar quizzes: ' + error.message, 'error');
            
            const grid = document.getElementById('quizzesGrid');
            if (grid) {
                grid.innerHTML = `
                    <div class="empty-state" style="border-left: 4px solid #ff6b6b;">
                        <div class="empty-icon">⚠️</div>
                        <h3>Erro ao carregar quizzes</h3>
                        <p>${error.message}</p>
                        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">Tentar novamente</button>
                    </div>
                `;
            }
            return [];
        }
    }

    renderQuizzesList(quizzes) {
        const grid = document.getElementById('quizzesGrid');
        if (!grid) {
            console.error('❌ Elemento quizzesGrid não encontrado');
            return;
        }

        console.log('🎨 Renderizando lista com', quizzes.length, 'quizzes');

        if (!quizzes || quizzes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <h3>Nenhum quiz criado ainda</h3>
                    <p>Clique no botão acima para criar seu primeiro quiz</p>
                    <button onclick="window.location.href='create-quiz.html'" class="btn btn-primary" style="margin-top: 1rem;">
                        Criar Meu Primeiro Quiz
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = quizzes.map(quiz => {
            const questionCount = quiz.questions?.length || 0;
            const timesPlayed = quiz.timesPlayed || 0;
            const createdAt = Utils.formatDate(quiz.createdAt);
            const title = Utils.escapeHtml(quiz.title);
            const description = Utils.escapeHtml(quiz.description || 'Sem descricao');
            
            return `
            <div class="quiz-card" data-quiz-id="${quiz.id}">
                <div class="quiz-actions">
                    <button class="btn-icon edit-quiz" data-id="${quiz.id}" title="Editar">✏️</button>
                    <button class="btn-icon delete-quiz" data-id="${quiz.id}" title="Excluir">🗑️</button>
                    <button class="btn-icon play-quiz" data-id="${quiz.id}" title="Jogar">🎮</button>
                </div>
                <h3>${title}</h3>
                <p>${description}</p>
                <div class="quiz-stats">
                    <span>📊 ${questionCount} perguntas</span>
                    <span>🎯 ${timesPlayed} jogadas</span>
                    <span>📅 ${createdAt}</span>
                </div>
            </div>
        `}).join('');

        document.querySelectorAll('.edit-quiz').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `create-quiz.html?edit=${btn.dataset.id}`;
            });
        });
        
        document.querySelectorAll('.delete-quiz').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteQuiz(btn.dataset.id);
            });
        });
        
        document.querySelectorAll('.play-quiz').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startQuizSession(btn.dataset.id);
            });
        });
        
        document.querySelectorAll('.quiz-card').forEach(card => {
            card.addEventListener('click', () => {
                const quizId = card.dataset.quizId;
                window.location.href = `create-quiz.html?view=${quizId}`;
            });
        });
        
        console.log('✅ Lista renderizada com sucesso!');
    }

    updateStats(quizzes) {
        const totalQuizzes = quizzes.length;
        const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questions?.length || 0), 0);
        const totalPlays = quizzes.reduce((sum, q) => sum + (q.timesPlayed || 0), 0);
        
        const totalQuizzesElem = document.getElementById('totalQuizzes');
        const totalQuestionsElem = document.getElementById('totalQuestions');
        const totalPlaysElem = document.getElementById('totalPlays');
        
        if (totalQuizzesElem) totalQuizzesElem.textContent = totalQuizzes;
        if (totalQuestionsElem) totalQuestionsElem.textContent = totalQuestions;
        if (totalPlaysElem) totalPlaysElem.textContent = totalPlays;
        
        console.log('📊 Estatisticas:', { totalQuizzes, totalQuestions, totalPlays });
    }

    async confirmDeleteQuiz(quizId) {
        const modal = document.getElementById('confirmModal');
        if (!modal) return;
        
        document.getElementById('confirmMessage').textContent = 'Tem certeza que deseja excluir este quiz? Esta ação não pode ser desfeita.';
        modal.style.display = 'block';
        
        const confirmYes = document.getElementById('confirmYes');
        const confirmNo = document.getElementById('confirmNo');
        
        const handleYes = async () => {
            await this.deleteQuiz(quizId);
            modal.style.display = 'none';
            cleanup();
        };
        const handleNo = () => {
            modal.style.display = 'none';
            cleanup();
        };
        const cleanup = () => {
            confirmYes.removeEventListener('click', handleYes);
            confirmNo.removeEventListener('click', handleNo);
        };
        
        confirmYes.addEventListener('click', handleYes);
        confirmNo.addEventListener('click', handleNo);
    }

    async deleteQuiz(quizId) {
        if (!this.currentUser) return;
        try {
            await db.collection('quizzes').doc(quizId).delete();
            Utils.showToast('Quiz excluido com sucesso!', 'success');
            this.loadUserQuizzes();
        } catch (error) {
            console.error('Erro ao deletar quiz:', error);
            Utils.showToast('Erro ao deletar quiz: ' + error.message, 'error');
        }
    }

    async startQuizSession(quizId) {
        try {
            const quizDoc = await db.collection('quizzes').doc(quizId).get();
            if (!quizDoc.exists) {
                Utils.showToast('Quiz não encontrado', 'error');
                return;
            }
            const quiz = { id: quizDoc.id, ...quizDoc.data() };
            const roomCode = generateRoomCode();
            const roomId = Utils.generateId();

            const room = {
                id: roomId,
                quizId: quizId,
                code: roomCode,
                creatorId: this.currentUser.uid,
                creatorName: this.currentUser.displayName || this.currentUser.email,
                status: 'waiting',
                currentQuestionIndex: 0,
                currentQuestionStartTime: null,
                players: {},
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                active: true,
                quizTitle: quiz.title,
                questions: quiz.questions  // <-- guardar todas as perguntas na sala
            };

            await db.collection('rooms').doc(roomId).set(room);
            await db.collection('quizzes').doc(quizId).update({
                timesPlayed: firebase.firestore.FieldValue.increment(1)
            });

            window.location.href = `host.html?room=${roomId}`;
        } catch (error) {
            Utils.showToast('Erro ao iniciar sessão: ' + error.message, 'error');
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, iniciando QuizManager V2...');
    window.quizManager = new QuizManager();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            window.location.href = 'index.html';
        });
    }
    
    const createNewQuiz = document.getElementById('createNewQuiz');
    if (createNewQuiz) {
        createNewQuiz.addEventListener('click', () => window.location.href = 'create-quiz.html');
    }
});