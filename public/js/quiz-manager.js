// Gerenciador de Quizzes - CRUD completo
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
            if (user && window.location.pathname.includes('my-quizzes.html')) {
                this.loadUserQuizzes();
            }
        });
    }

    // Criar novo quiz
    async createQuiz(quizData) {
        if (!this.currentUser) {
            Utils.showToast('Você precisa estar logado', 'error');
            return null;
        }

        try {
            const quizId = Utils.generateId();
            const quiz = {
                id: quizId,
                title: quizData.title,
                description: quizData.description || '',
                creatorId: this.currentUser.uid,
                creatorName: this.currentUser.displayName || this.currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                questions: quizData.questions || [],
                settings: {
                    randomizeQuestions: quizData.randomizeQuestions || false,
                    showCorrectAnswer: quizData.showCorrectAnswer || true,
                    defaultTimeLimit: quizData.defaultTimeLimit || 30
                },
                timesPlayed: 0,
                tags: quizData.tags || []
            };

            await db.collection('quizzes').doc(quizId).set(quiz);
            Utils.showToast('Quiz criado com sucesso!', 'success');
            return quiz;
        } catch (error) {
            console.error('Erro ao criar quiz:', error);
            Utils.showToast('Erro ao criar quiz: ' + error.message, 'error');
            return null;
        }
    }

    // Atualizar quiz existente
    async updateQuiz(quizId, quizData) {
        if (!this.currentUser) return null;

        try {
            const updates = {
                ...quizData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('quizzes').doc(quizId).update(updates);
            Utils.showToast('Quiz atualizado com sucesso!', 'success');
            return true;
        } catch (error) {
            console.error('Erro ao atualizar quiz:', error);
            Utils.showToast('Erro ao atualizar quiz: ' + error.message, 'error');
            return false;
        }
    }

    // Carregar quizzes do usuário
    async loadUserQuizzes() {
        if (!this.currentUser) return [];

        try {
            const snapshot = await db.collection('quizzes')
                .where('creatorId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();

            const quizzes = [];
            snapshot.forEach(doc => {
                quizzes.push({ id: doc.id, ...doc.data() });
            });

            this.renderQuizzesList(quizzes);
            this.updateStats(quizzes);
            return quizzes;
        } catch (error) {
            console.error('Erro ao carregar quizzes:', error);
            Utils.showToast('Erro ao carregar quizzes', 'error');
            return [];
        }
    }

    // Renderizar lista de quizzes
    renderQuizzesList(quizzes) {
        const grid = document.getElementById('quizzesGrid');
        if (!grid) return;

        if (quizzes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <h3>Nenhum quiz criado ainda</h3>
                    <p>Clique em "Criar Novo Quiz" para começar</p>
                    <button onclick="window.location.href='create-quiz.html'" class="btn btn-primary">
                        Criar Meu Primeiro Quiz
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = quizzes.map(quiz => `
            <div class="quiz-card" data-quiz-id="${quiz.id}">
                <div class="quiz-actions">
                    <button class="btn-icon edit-quiz" data-id="${quiz.id}">✏️</button>
                    <button class="btn-icon delete-quiz" data-id="${quiz.id}">🗑️</button>
                    <button class="btn-icon play-quiz" data-id="${quiz.id}">🎮</button>
                </div>
                <h3>${this.escapeHtml(quiz.title)}</h3>
                <p>${this.escapeHtml(quiz.description || 'Sem descrição')}</p>
                <div class="quiz-stats">
                    <span>📊 ${quiz.questions?.length || 0} perguntas</span>
                    <span>🎯 ${quiz.timesPlayed || 0} jogadas</span>
                    <span>📅 ${Utils.formatDate(quiz.createdAt)}</span>
                </div>
            </div>
        `).join('');

        // Adicionar event listeners
        document.querySelectorAll('.edit-quiz').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const quizId = btn.dataset.id;
                window.location.href = `create-quiz.html?edit=${quizId}`;
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
    }

    // Atualizar estatísticas
    updateStats(quizzes) {
        const totalQuizzes = quizzes.length;
        const totalQuestions = quizzes.reduce((sum, quiz) => sum + (quiz.questions?.length || 0), 0);
        const totalPlays = quizzes.reduce((sum, quiz) => sum + (quiz.timesPlayed || 0), 0);

        document.getElementById('totalQuizzes').textContent = totalQuizzes;
        document.getElementById('totalQuestions').textContent = totalQuestions;
        document.getElementById('totalPlays').textContent = totalPlays;
    }

    // Confirmar deleção de quiz
    async confirmDeleteQuiz(quizId) {
        const modal = document.getElementById('confirmModal');
        const message = document.getElementById('confirmMessage');
        message.textContent = 'Tem certeza que deseja excluir este quiz? Esta ação não pode ser desfeita.';
        
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

    // Deletar quiz
    async deleteQuiz(quizId) {
        if (!this.currentUser) return;

        try {
            await db.collection('quizzes').doc(quizId).delete();
            Utils.showToast('Quiz excluído com sucesso!', 'success');
            this.loadUserQuizzes();
        } catch (error) {
            console.error('Erro ao deletar quiz:', error);
            Utils.showToast('Erro ao deletar quiz: ' + error.message, 'error');
        }
    }

    // Iniciar sessão de quiz
    async startQuizSession(quizId) {
        try {
            const quizDoc = await db.collection('quizzes').doc(quizId).get();
            if (!quizDoc.exists) {
                Utils.showToast('Quiz não encontrado', 'error');
                return;
            }

            const quiz = { id: quizDoc.id, ...quizDoc.data() };
            
            // Criar sala
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
                quizTitle: quiz.title
            };
            
            await db.collection('rooms').doc(roomId).set(room);
            
            // Incrementar contador de jogadas
            await db.collection('quizzes').doc(quizId).update({
                timesPlayed: firebase.firestore.FieldValue.increment(1)
            });
            
            // Redirecionar para host.html com o ID da sala
            window.location.href = `host.html?room=${roomId}`;
        } catch (error) {
            console.error('Erro ao iniciar sessão:', error);
            Utils.showToast('Erro ao iniciar sessão: ' + error.message, 'error');
        }
    }

    // Carregar quiz para edição
    async loadQuizForEdit(quizId) {
        try {
            const quizDoc = await db.collection('quizzes').doc(quizId).get();
            if (!quizDoc.exists) {
                Utils.showToast('Quiz não encontrado', 'error');
                return null;
            }

            const quiz = { id: quizDoc.id, ...quizDoc.data() };
            this.currentQuiz = quiz;
            this.questions = quiz.questions || [];
            return quiz;
        } catch (error) {
            console.error('Erro ao carregar quiz:', error);
            Utils.showToast('Erro ao carregar quiz', 'error');
            return null;
        }
    }

    // Salvar quiz atual
    async saveCurrentQuiz() {
        const title = document.getElementById('quizTitle')?.value;
        const description = document.getElementById('quizDescription')?.value;
        const randomize = document.getElementById('randomizeQuestions')?.checked || false;
        const showCorrect = document.getElementById('showCorrectAnswer')?.checked || false;

        if (!title) {
            Utils.showToast('Por favor, insira um título para o quiz', 'warning');
            return false;
        }

        if (this.questions.length === 0) {
            Utils.showToast('Adicione pelo menos uma pergunta ao quiz', 'warning');
            return false;
        }

        // Validar perguntas
        for (let i = 0; i < this.questions.length; i++) {
            const q = this.questions[i];
            if (!q.text || q.text.trim() === '') {
                Utils.showToast(`Pergunta ${i + 1} está vazia`, 'warning');
                return false;
            }
            if (!q.options || q.options.length < 2) {
                Utils.showToast(`Pergunta ${i + 1} precisa ter pelo menos 2 opções`, 'warning');
                return false;
            }
            if (q.correct === undefined || q.correct === null) {
                Utils.showToast(`Pergunta ${i + 1} precisa ter uma resposta correta marcada`, 'warning');
                return false;
            }
        }

        const quizData = {
            title: title,
            description: description,
            questions: this.questions,
            settings: {
                randomizeQuestions: randomize,
                showCorrectAnswer: showCorrect,
                defaultTimeLimit: 30
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (this.currentQuiz && this.currentQuiz.id) {
            await this.updateQuiz(this.currentQuiz.id, quizData);
            return true;
        } else {
            const newQuiz = await this.createQuiz(quizData);
            if (newQuiz) {
                window.location.href = 'my-quizzes.html';
                return true;
            }
            return false;
        }
    }

    // Escapar HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.quizManager = new QuizManager();
    
    // Botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            window.location.href = 'index.html';
        });
    }
    
    // Botão de criar novo quiz
    const createNewQuiz = document.getElementById('createNewQuiz');
    if (createNewQuiz) {
        createNewQuiz.addEventListener('click', () => {
            window.location.href = 'create-quiz.html';
        });
    }
    
    // Salvar quiz na página de criação
    const saveQuizBtn = document.getElementById('saveQuizBtn');
    if (saveQuizBtn) {
        saveQuizBtn.addEventListener('click', async () => {
            saveQuizBtn.disabled = true;
            saveQuizBtn.textContent = 'Salvando...';
            const success = await window.quizManager.saveCurrentQuiz();
            if (success) {
                window.location.href = 'my-quizzes.html';
            } else {
                saveQuizBtn.disabled = false;
                saveQuizBtn.textContent = '💾 Salvar Quiz';
            }
        });
    }
    
    // Cancelar
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = 'my-quizzes.html';
        });
    }
});