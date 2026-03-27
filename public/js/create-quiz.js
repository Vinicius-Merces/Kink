// Gerenciador de criação/edição de quizzes
class QuizEditor {
    constructor() {
        this.questions = [];
        this.editingQuestionIndex = null;
        this.quizId = null;
        this.isEditMode = false;
        
        this.init();
    }

    async init() {
        // Verificar autenticação
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            
            // Verificar se é edição
            const urlParams = new URLSearchParams(window.location.search);
            this.quizId = urlParams.get('edit') || urlParams.get('view');
            
            if (this.quizId) {
                this.isEditMode = true;
                await this.loadQuiz();
            }
            
            this.setupEventListeners();
            this.renderQuestions();
        });
    }

    async loadQuiz() {
        try {
            const quizDoc = await db.collection('quizzes').doc(this.quizId).get();
            if (!quizDoc.exists) {
                Utils.showToast('Quiz não encontrado', 'error');
                window.location.href = 'my-quizzes.html';
                return;
            }
            
            const quiz = { id: quizDoc.id, ...quizDoc.data() };
            
            // Verificar se o usuário é o criador
            if (quiz.creatorId !== auth.currentUser.uid) {
                Utils.showToast('Você não tem permissão para editar este quiz', 'error');
                window.location.href = 'my-quizzes.html';
                return;
            }
            
            // Preencher formulário
            document.getElementById('quizTitle').value = quiz.title || '';
            document.getElementById('quizDescription').value = quiz.description || '';
            document.getElementById('randomizeQuestions').checked = quiz.settings?.randomizeQuestions || false;
            document.getElementById('showCorrectAnswer').checked = quiz.settings?.showCorrectAnswer || true;
            
            this.questions = quiz.questions || [];
            this.renderQuestions();
            
            Utils.showToast('Quiz carregado para edição', 'success');
            
        } catch (error) {
            console.error('Erro ao carregar quiz:', error);
            Utils.showToast('Erro ao carregar quiz', 'error');
        }
    }

    setupEventListeners() {
        // Botão adicionar pergunta
        const addBtn = document.getElementById('addQuestionBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openQuestionModal());
        }
        
        // Fechar modal
        const closeModal = document.querySelector('#questionModal .close');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }
        
        const cancelBtn = document.getElementById('cancelQuestionBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Salvar pergunta
        const questionForm = document.getElementById('questionForm');
        if (questionForm) {
            questionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveQuestion();
            });
        }
        
        // Adicionar opção
        const addOptionBtn = document.getElementById('addOptionBtn');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => this.addOption());
        }
        
        // Salvar quiz
        const saveQuizBtn = document.getElementById('saveQuizBtn');
        if (saveQuizBtn) {
            saveQuizBtn.addEventListener('click', () => this.saveQuiz());
        }
        
        // Cancelar
        const cancelQuizBtn = document.getElementById('cancelBtn');
        if (cancelQuizBtn) {
            cancelQuizBtn.addEventListener('click', () => {
                window.location.href = 'my-quizzes.html';
            });
        }
    }

    openQuestionModal(questionIndex = null) {
        this.editingQuestionIndex = questionIndex;
        const modal = document.getElementById('questionModal');
        const modalTitle = document.getElementById('modalTitle');
        
        if (questionIndex !== null) {
            modalTitle.textContent = 'Editar Pergunta';
            this.loadQuestionToForm(this.questions[questionIndex]);
        } else {
            modalTitle.textContent = 'Nova Pergunta';
            this.clearForm();
        }
        
        modal.style.display = 'block';
    }

    clearForm() {
        document.getElementById('questionText').value = '';
        document.getElementById('timeLimit').value = '30';
        
        // Limpar opções
        const optionsList = document.getElementById('optionsList');
        optionsList.innerHTML = '';
        
        // Adicionar 4 opções padrão
        for (let i = 0; i < 4; i++) {
            this.addOption();
        }
    }

    loadQuestionToForm(question) {
        document.getElementById('questionText').value = question.text;
        document.getElementById('timeLimit').value = question.timeLimit || 30;
        
        // Limpar opções
        const optionsList = document.getElementById('optionsList');
        optionsList.innerHTML = '';
        
        // Adicionar opções
        question.options.forEach((option, index) => {
            const optionDiv = this.createOptionElement(index);
            const input = optionDiv.querySelector('.option-text');
            input.value = option;
            
            const radio = optionDiv.querySelector('input[type="radio"]');
            radio.value = index;
            if (index === question.correct) {
                radio.checked = true;
            }
            
            optionsList.appendChild(optionDiv);
        });
    }

    addOption() {
        const optionsList = document.getElementById('optionsList');
        const optionCount = optionsList.children.length;
        const optionDiv = this.createOptionElement(optionCount);
        optionsList.appendChild(optionDiv);
    }

    createOptionElement(index) {
        const div = document.createElement('div');
        div.className = 'option-item';
        div.innerHTML = `
            <input type="text" class="option-text" placeholder="Opção ${String.fromCharCode(65 + index)}" required>
            <label class="radio-label">
                <input type="radio" name="correctOption" value="${index}"> Correta
            </label>
            <button type="button" class="remove-option" onclick="this.parentElement.remove()">🗑️</button>
        `;
        return div;
    }

    saveQuestion() {
        const questionText = document.getElementById('questionText').value.trim();
        const timeLimit = parseInt(document.getElementById('timeLimit').value);
        
        if (!questionText) {
            Utils.showToast('Por favor, digite a pergunta', 'warning');
            return;
        }
        
        // Coletar opções
        const options = [];
        const optionInputs = document.querySelectorAll('#optionsList .option-text');
        let correctIndex = null;
        
        optionInputs.forEach((input, idx) => {
            const value = input.value.trim();
            if (value) {
                options.push(value);
            }
        });
        
        // Verificar opção correta
        const radios = document.querySelectorAll('input[name="correctOption"]');
        radios.forEach((radio, idx) => {
            if (radio.checked && idx < options.length) {
                correctIndex = idx;
            }
        });
        
        if (options.length < 2) {
            Utils.showToast('Adicione pelo menos 2 opções de resposta', 'warning');
            return;
        }
        
        if (correctIndex === null) {
            Utils.showToast('Marque a resposta correta', 'warning');
            return;
        }
        
        const question = {
            id: Utils.generateId(),
            text: questionText,
            options: options,
            correct: correctIndex,
            timeLimit: timeLimit,
            pointsMultiplier: 1
        };
        
        if (this.editingQuestionIndex !== null) {
            this.questions[this.editingQuestionIndex] = question;
            Utils.showToast('Pergunta atualizada!', 'success');
        } else {
            this.questions.push(question);
            Utils.showToast('Pergunta adicionada!', 'success');
        }
        
        this.renderQuestions();
        this.closeModal();
    }

    renderQuestions() {
        const container = document.getElementById('questionsList');
        if (!container) return;
        
        if (this.questions.length === 0) {
            container.innerHTML = `
                <div class="empty-questions">
                    <p>📝 Nenhuma pergunta adicionada ainda</p>
                    <p>Clique no botão acima para começar a criar seu quiz</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.questions.map((question, index) => `
            <div class="question-item">
                <div class="question-text">
                    <strong>Pergunta ${index + 1}</strong><br>
                    ${this.escapeHtml(question.text)}
                </div>
                <div class="question-meta">
                    <span>📝 ${question.options.length} opções</span>
                    <span>⏱️ ${question.timeLimit}s</span>
                    <span>✅ Opção correta: ${String.fromCharCode(65 + question.correct)}</span>
                </div>
                <div class="question-actions">
                    <button class="edit-question" data-index="${index}">✏️ Editar</button>
                    <button class="delete-question" data-index="${index}">🗑️ Excluir</button>
                </div>
            </div>
        `).join('');
        
        // Adicionar event listeners
        document.querySelectorAll('.edit-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.openQuestionModal(index);
            });
        });
        
        document.querySelectorAll('.delete-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.deleteQuestion(index);
            });
        });
    }

    deleteQuestion(index) {
        if (confirm('Tem certeza que deseja excluir esta pergunta?')) {
            this.questions.splice(index, 1);
            this.renderQuestions();
            Utils.showToast('Pergunta excluída!', 'success');
        }
    }

    async saveQuiz() {
        const title = document.getElementById('quizTitle').value.trim();
        const description = document.getElementById('quizDescription').value.trim();
        const randomize = document.getElementById('randomizeQuestions').checked;
        const showCorrect = document.getElementById('showCorrectAnswer').checked;
        
        if (!title) {
            Utils.showToast('Por favor, insira um título para o quiz', 'warning');
            return;
        }
        
        if (this.questions.length === 0) {
            Utils.showToast('Adicione pelo menos uma pergunta ao quiz', 'warning');
            return;
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
        
        try {
            if (this.isEditMode && this.quizId) {
                await db.collection('quizzes').doc(this.quizId).update(quizData);
                Utils.showToast('Quiz atualizado com sucesso!', 'success');
            } else {
                const quizId = Utils.generateId();
                await db.collection('quizzes').doc(quizId).set({
                    ...quizData,
                    id: quizId,
                    creatorId: auth.currentUser.uid,
                    creatorName: auth.currentUser.displayName || auth.currentUser.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    timesPlayed: 0
                });
                Utils.showToast('Quiz criado com sucesso!', 'success');
            }
            
            setTimeout(() => {
                window.location.href = 'my-quizzes.html';
            }, 1500);
            
        } catch (error) {
            console.error('Erro ao salvar quiz:', error);
            Utils.showToast('Erro ao salvar quiz: ' + error.message, 'error');
        }
    }

    closeModal() {
        const modal = document.getElementById('questionModal');
        modal.style.display = 'none';
        this.editingQuestionIndex = null;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.quizEditor = new QuizEditor();
});