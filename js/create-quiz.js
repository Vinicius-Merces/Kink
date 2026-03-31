// Gerenciador de criação/edição de quizzes
class QuizEditor {
    constructor() {
        console.log('🔧 QuizEditor instanciado');
        this.questions = [];
        this.editingQuestionIndex = null;
        this.quizId = null;
        this.isEditMode = false;
        this.init();
    }

    async init() {
        console.log('🔧 QuizEditor inicializando...');
        // Aguardar autenticação
        auth.onAuthStateChanged(async (user) => {
            console.log('📡 Auth state changed:', user ? user.displayName : 'null');
            if (!user) {
                Utils.showToast('Você precisa estar logado', 'warning');
                setTimeout(() => window.location.href = 'index.html', 1500);
                return;
            }

            const urlParams = new URLSearchParams(window.location.search);
            this.quizId = urlParams.get('edit') || urlParams.get('view');
            console.log('📝 Quiz ID:', this.quizId || 'Novo quiz');

            if (this.quizId) {
                this.isEditMode = true;
                await this.loadQuiz();
            }

            this.setupEventListeners();
            this.renderQuestions();
            console.log('✅ QuizEditor pronto');
        });
    }

    async loadQuiz() {
        try {
            const quizDoc = await db.collection('quizzes').doc(this.quizId).get();
            if (!quizDoc.exists) {
                Utils.showToast('Quiz não encontrado', 'error');
                setTimeout(() => window.location.href = 'my-quizzes.html', 1500);
                return;
            }
            const quiz = { id: quizDoc.id, ...quizDoc.data() };
            if (quiz.creatorId !== auth.currentUser.uid) {
                Utils.showToast('Você não tem permissão para editar este quiz', 'error');
                setTimeout(() => window.location.href = 'my-quizzes.html', 1500);
                return;
            }
            document.getElementById('quizTitle').value = quiz.title || '';
            document.getElementById('quizDescription').value = quiz.description || '';
            document.getElementById('randomizeQuestions').checked = quiz.settings?.randomizeQuestions || false;
            document.getElementById('showCorrectAnswer').checked = quiz.settings?.showCorrectAnswer !== false;
            this.questions = quiz.questions || [];
            this.renderQuestions();
            Utils.showToast('Quiz carregado para edição', 'success');
        } catch (error) {
            console.error('Erro ao carregar quiz:', error);
            Utils.showToast('Erro ao carregar quiz: ' + error.message, 'error');
        }
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');

        // Adicionar pergunta
        const addBtn = document.getElementById('addQuestionBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openQuestionModal());
        else console.error('❌ addQuestionBtn não encontrado');

        // Fechar modal (X)
        const closeModal = document.querySelector('#questionModal .close');
        if (closeModal) closeModal.addEventListener('click', () => this.closeModal());

        // Cancelar no modal
        const cancelModal = document.getElementById('cancelQuestionBtn');
        if (cancelModal) cancelModal.addEventListener('click', () => this.closeModal());

        // Formulário da pergunta
        const questionForm = document.getElementById('questionForm');
        if (questionForm) {
            questionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveQuestion();
            });
        }

        // Adicionar opção
        const addOptionBtn = document.getElementById('addOptionBtn');
        if (addOptionBtn) addOptionBtn.addEventListener('click', () => this.addOption());

        // Botão Salvar Quiz (CRUCIAL)
        const saveQuizBtn = document.getElementById('saveQuizBtn');
        if (saveQuizBtn) {
            console.log('✅ Botão Salvar Quiz encontrado');
            saveQuizBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('💾 Botão Salvar clicado');
                saveQuizBtn.disabled = true;
                saveQuizBtn.textContent = '💾 Salvando...';
                const success = await this.saveQuiz();
                if (success) {
                    console.log('✅ Quiz salvo com sucesso!');
                    Utils.showToast('Quiz salvo com sucesso!', 'success');
                    setTimeout(() => {
                        window.location.href = 'my-quizzes.html';
                    }, 1500);
                } else {
                    console.log('❌ Erro ao salvar quiz');
                    saveQuizBtn.disabled = false;
                    saveQuizBtn.textContent = '💾 Salvar Quiz';
                }
            });
        } else {
            console.error('❌ Botão saveQuizBtn não encontrado');
        }

        // Botão Cancelar (principal)
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            console.log('✅ Botão Cancelar encontrado');
            cancelBtn.addEventListener('click', () => {
                console.log('❌ Cancelar clicado');
                window.location.href = 'my-quizzes.html';
            });
        } else {
            console.error('❌ Botão cancelBtn não encontrado');
        }

        console.log('✅ Event listeners configurados');
    }

    openQuestionModal(questionIndex = null) {
        this.editingQuestionIndex = questionIndex;
        const modal = document.getElementById('questionModal');
        const modalTitle = document.getElementById('modalTitle');
        modalTitle.textContent = questionIndex !== null ? 'Editar Pergunta' : 'Nova Pergunta';

        if (questionIndex !== null) this.loadQuestionToForm(this.questions[questionIndex]);
        else this.clearForm();

        modal.style.display = 'block';
    }

    clearForm() {
        document.getElementById('questionText').value = '';
        document.getElementById('timeLimit').value = '30';
        const optionsList = document.getElementById('optionsList');
        optionsList.innerHTML = '';
        // Adicionar 4 opções vazias
        for (let i = 0; i < 4; i++) this.addOption();
        // Resetar radio buttons
        const radios = document.querySelectorAll('input[name="correctOption"]');
        radios.forEach(radio => radio.checked = false);
    }

    loadQuestionToForm(question) {
        document.getElementById('questionText').value = question.text;
        document.getElementById('timeLimit').value = question.timeLimit || 30;
        const optionsList = document.getElementById('optionsList');
        optionsList.innerHTML = '';
        question.options.forEach((option, index) => {
            const optionDiv = this.createOptionElement(index);
            optionDiv.querySelector('.option-text').value = option;
            const radio = optionDiv.querySelector('input[type="radio"]');
            radio.value = index;
            if (index === question.correct) radio.checked = true;
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

        const options = [];
        const optionInputs = document.querySelectorAll('#optionsList .option-text');
        let correctIndex = null;
        optionInputs.forEach((input, idx) => {
            const value = input.value.trim();
            if (value) options.push(value);
        });

        const radios = document.querySelectorAll('input[name="correctOption"]');
        radios.forEach((radio, idx) => {
            if (radio.checked && idx < options.length) correctIndex = idx;
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
            container.innerHTML = `<div class="empty-questions"><p>📝 Nenhuma pergunta adicionada ainda</p><p>Clique no botão acima para começar a criar seu quiz</p></div>`;
            return;
        }
        container.innerHTML = this.questions.map((question, index) => `
            <div class="question-item">
                <div class="question-text"><strong>Pergunta ${index + 1}</strong><br>${Utils.escapeHtml(question.text)}</div>
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

        document.querySelectorAll('.edit-question').forEach(btn => {
            btn.addEventListener('click', () => this.openQuestionModal(parseInt(btn.dataset.index)));
        });
        document.querySelectorAll('.delete-question').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja excluir esta pergunta?')) {
                    this.questions.splice(parseInt(btn.dataset.index), 1);
                    this.renderQuestions();
                    Utils.showToast('Pergunta excluída!', 'success');
                }
            });
        });
    }

    async saveQuiz() {
        const title = document.getElementById('quizTitle').value.trim();
        const description = document.getElementById('quizDescription').value.trim();
        const randomize = document.getElementById('randomizeQuestions').checked;
        const showCorrect = document.getElementById('showCorrectAnswer').checked;

        if (!title) {
            Utils.showToast('Por favor, insira um título para o quiz', 'warning');
            return false;
        }
        if (this.questions.length === 0) {
            Utils.showToast('Adicione pelo menos uma pergunta ao quiz', 'warning');
            return false;
        }

        // Validação individual das perguntas
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
            settings: { randomizeQuestions: randomize, showCorrectAnswer: showCorrect, defaultTimeLimit: 30 },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (this.isEditMode && this.quizId) {
                await db.collection('quizzes').doc(this.quizId).update(quizData);
                Utils.showToast('Quiz atualizado com sucesso!', 'success');
                return true;
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
                return true;
            }
        } catch (error) {
            console.error('Erro ao salvar quiz:', error);
            Utils.showToast('Erro ao salvar quiz: ' + error.message, 'error');
            return false;
        }
    }

    closeModal() {
        document.getElementById('questionModal').style.display = 'none';
        this.editingQuestionIndex = null;
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, iniciando QuizEditor...');
    window.quizEditor = new QuizEditor();
});