// Player - Tela do Aluno
class PlayerManager {
    constructor() {
        this.roomCode = null;
        this.room = null;
        this.quiz = null;
        this.playerId = null;
        this.playerName = null;
        this.playerAvatar = null;
        this.currentQuestion = null;
        this.questionStartTime = null;
        this.hasAnswered = false;
        this.timerInterval = null;
        this.nextTimerInterval = null;
        
        this.roomUnsubscribe = null;
        this.scoresUnsubscribe = null;
        
        this.init();
    }

    async init() {
        // Pegar código da URL
        const urlParams = new URLSearchParams(window.location.search);
        this.roomCode = urlParams.get('code');
        
        if (this.roomCode) {
            document.getElementById('roomCodeInput').value = this.roomCode;
            await this.checkRoom();
        }
        
        this.setupEventListeners();
        this.loadAvatars();
    }

    setupEventListeners() {
        // Verificar sala
        const checkRoomBtn = document.getElementById('checkRoomBtn');
        if (checkRoomBtn) {
            checkRoomBtn.addEventListener('click', () => this.checkRoom());
        }
        
        // Entrar no jogo
        const joinGameBtn = document.getElementById('joinGameBtn');
        if (joinGameBtn) {
            joinGameBtn.addEventListener('click', () => this.joinGame());
        }
        
        // Sair do jogo
        const exitGameBtn = document.getElementById('exitGameBtn');
        if (exitGameBtn) {
            exitGameBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        // Permitir Enter no input
        const roomCodeInput = document.getElementById('roomCodeInput');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.checkRoom();
            });
        }
        
        const playerNameInput = document.getElementById('playerName');
        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.joinGame();
            });
        }
    }

    loadAvatars() {
        const avatars = [
            { id: 'avatar1', emoji: '🐱', name: 'Gato' },
            { id: 'avatar2', emoji: '🐶', name: 'Cachorro' },
            { id: 'avatar3', emoji: '🦊', name: 'Raposa' },
            { id: 'avatar4', emoji: '🐼', name: 'Panda' },
            { id: 'avatar5', emoji: '🐨', name: 'Koala' },
            { id: 'avatar6', emoji: '🐸', name: 'Sapo' },
            { id: 'avatar7', emoji: '🐙', name: 'Polvo' },
            { id: 'avatar8', emoji: '🦄', name: 'Unicórnio' }
        ];
        
        const grid = document.getElementById('avatarsGrid');
        if (!grid) return;
        
        grid.innerHTML = avatars.map(avatar => `
            <div class="avatar-option" data-avatar="${avatar.id}">
                <div class="avatar-emoji">${avatar.emoji}</div>
                <div class="avatar-name">${avatar.name}</div>
            </div>
        `).join('');
        
        // Selecionar primeiro avatar por padrão
        const firstAvatar = document.querySelector('.avatar-option');
        if (firstAvatar) {
            firstAvatar.classList.add('selected');
            this.playerAvatar = 'avatar1';
        }
        
        // Event listeners para avatares
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                this.playerAvatar = option.dataset.avatar;
            });
        });
    }

    async checkRoom() {
        const codeInput = document.getElementById('roomCodeInput');
        const code = codeInput.value.toUpperCase().trim();
        
        if (!code || code.length !== 6) {
            Utils.showToast('Por favor, insira um código válido de 6 caracteres', 'warning');
            return;
        }
        
        try {
            const snapshot = await db.collection('rooms')
                .where('code', '==', code)
                .where('active', '==', true)
                .get();
            
            if (snapshot.empty) {
                Utils.showToast('Sala não encontrada ou já encerrada', 'error');
                return;
            }
            
            this.room = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            this.roomCode = code;
            
            // Carregar quiz
            const quizDoc = await db.collection('quizzes').doc(this.room.quizId).get();
            this.quiz = { id: quizDoc.id, ...quizDoc.data() };
            
            // Ir para tela de perfil
            this.showScreen('profileScreen');
            
        } catch (error) {
            console.error('Erro ao verificar sala:', error);
            Utils.showToast('Erro ao verificar sala', 'error');
        }
    }

    async joinGame() {
        const nameInput = document.getElementById('playerName');
        const name = nameInput.value.trim();
        
        if (!name) {
            Utils.showToast('Por favor, digite seu nome', 'warning');
            return;
        }
        
        if (!this.playerAvatar) {
            Utils.showToast('Por favor, escolha um avatar', 'warning');
            return;
        }
        
        // Gerar ID único para o jogador
        this.playerId = Utils.generateId();
        this.playerName = name;
        
        try {
            // Adicionar jogador à sala
            await db.collection(`rooms/${this.room.id}/players`).doc(this.playerId).set({
                id: this.playerId,
                name: name,
                avatar: this.playerAvatar,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'ready'
            });
            
            // Criar documento de pontuação inicial
            await db.collection(`rooms/${this.room.id}/scores`).doc(this.playerId).set({
                playerId: this.playerId,
                playerName: name,
                avatar: this.playerAvatar,
                totalScore: 0,
                answers: {},
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Ir para tela de espera
            this.showScreen('waitingScreen');
            document.getElementById('waitingRoomCode').textContent = this.roomCode;
            
            // Configurar listeners da sala
            this.setupGameListeners();
            
        } catch (error) {
            console.error('Erro ao entrar no jogo:', error);
            Utils.showToast('Erro ao entrar no jogo', 'error');
        }
    }

    setupGameListeners() {
        // Ouvir mudanças na sala
        this.roomUnsubscribe = db.collection('rooms').doc(this.room.id)
            .onSnapshot((doc) => {
                if (!doc.exists) {
                    Utils.showToast('Sala encerrada', 'info');
                    window.location.href = 'index.html';
                    return;
                }
                
                const roomData = doc.data();
                this.handleRoomUpdate(roomData);
            });
        
        // Ouvir pontuações para ranking
        this.scoresUnsubscribe = db.collection(`rooms/${this.room.id}/scores`)
            .orderBy('totalScore', 'desc')
            .onSnapshot((snapshot) => {
                if (this.currentScreen === 'finalScreen') {
                    this.updateFinalRanking(snapshot);
                } else if (this.currentScreen === 'waitingScreen') {
                    this.updateWaitingPlayers(snapshot);
                }
            });
    }

    handleRoomUpdate(roomData) {
        this.room = { ...this.room, ...roomData };
        
        if (roomData.status === 'question_active') {
            this.handleQuestionStart(roomData);
        } else if (roomData.status === 'active') {
            if (this.currentScreen === 'questionScreen') {
                // Mostrar resultado após pergunta
                this.showResultScreen();
            }
        } else if (roomData.status === 'finished') {
            this.showFinalScreen();
        }
    }

    async handleQuestionStart(roomData) {
        if (this.currentScreen === 'questionScreen') return;
        
        const currentIndex = roomData.currentQuestionIndex;
        const questionData = roomData.currentQuestionData;
        
        if (!questionData) return;
        
        this.currentQuestion = {
            index: currentIndex,
            text: questionData.text,
            options: questionData.options,
            timeLimit: questionData.timeLimit,
            correct: questionData.correct
        };
        
        this.questionStartTime = roomData.currentQuestionStartTime?.toDate() || new Date();
        this.hasAnswered = false;
        
        // Resetar timer se existir
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Mostrar tela de pergunta
        this.showScreen('questionScreen');
        this.displayQuestion();
        this.startQuestionTimer();
    }

    displayQuestion() {
        document.getElementById('questionText').textContent = this.currentQuestion.text;
        
        // Gerar opções
        const optionsGrid = document.getElementById('optionsGrid');
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        
        optionsGrid.innerHTML = this.currentQuestion.options.map((option, index) => `
            <button class="option-btn" data-option="${index}">
                <div class="option-letter">${letters[index]}</div>
                <div class="option-text">${this.escapeHtml(option)}</div>
            </button>
        `).join('');
        
        // Adicionar event listeners
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.hasAnswered) {
                    this.submitAnswer(parseInt(btn.dataset.option));
                }
            });
        });
    }

    startQuestionTimer() {
        const timerCircle = document.getElementById('timerCircle');
        const timerValue = document.getElementById('timerValue');
        let timeLeft = this.currentQuestion.timeLimit;
        
        timerValue.textContent = timeLeft;
        
        this.timerInterval = setInterval(() => {
            timeLeft--;
            timerValue.textContent = Math.max(0, timeLeft);
            
            // Efeito visual quando tempo está acabando
            if (timeLeft <= 5) {
                timerCircle.style.animation = 'pulse 0.5s infinite';
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                if (!this.hasAnswered) {
                    this.submitAnswer(null);
                }
            }
        }, 1000);
    }

    async submitAnswer(selectedOption) {
        if (this.hasAnswered) return;
        this.hasAnswered = true;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        const responseTime = (new Date() - this.questionStartTime) / 1000;
        const isCorrect = selectedOption === this.currentQuestion.correct;
        
        // Calcular pontos
        let points = 0;
        if (isCorrect && selectedOption !== null) {
            const timeLimit = this.currentQuestion.timeLimit;
            const speedBonus = Math.max(0, (timeLimit - responseTime) / timeLimit);
            points = Math.floor(1000 * speedBonus);
        }
        
        // Salvar resposta
        try {
            await db.collection(`rooms/${this.room.id}/answers`).doc(`${this.currentQuestion.index}_${this.playerId}`).set({
                playerId: this.playerId,
                playerName: this.playerName,
                avatar: this.playerAvatar,
                questionIndex: this.currentQuestion.index,
                answer: selectedOption,
                isCorrect: isCorrect,
                responseTime: responseTime,
                points: points,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Atualizar pontuação local
            const currentScoreElem = document.getElementById('currentScore');
            if (currentScoreElem) {
                const currentScore = parseInt(currentScoreElem.textContent) || 0;
                currentScoreElem.textContent = currentScore + points;
            }
            
            // Mostrar feedback
            this.showQuestionFeedback(isCorrect, points, this.currentQuestion.options[this.currentQuestion.correct]);
            
            // Desabilitar opções
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.disabled = true;
                btn.classList.add('disabled');
            });
            
        } catch (error) {
            console.error('Erro ao enviar resposta:', error);
            Utils.showToast('Erro ao enviar resposta', 'error');
        }
    }

    showQuestionFeedback(isCorrect, points, correctAnswer) {
        const feedbackDiv = document.getElementById('feedbackMessage');
        const resultIcon = isCorrect ? '✅' : '❌';
        const message = isCorrect ? `Correto! +${points} pontos!` : `Errou! A resposta correta era: ${correctAnswer}`;
        
        feedbackDiv.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                <span class="feedback-icon">${resultIcon}</span>
                <span class="feedback-text">${message}</span>
            </div>
        `;
        
        feedbackDiv.style.display = 'block';
        
        // Esconder após 3 segundos
        setTimeout(() => {
            feedbackDiv.style.display = 'none';
        }, 3000);
    }

    showResultScreen() {
        if (this.nextTimerInterval) {
            clearInterval(this.nextTimerInterval);
        }
        
        this.showScreen('resultScreen');
        
        let timeLeft = 5;
        const nextTimerSpan = document.getElementById('nextTimer');
        
        this.nextTimerInterval = setInterval(() => {
            timeLeft--;
            if (nextTimerSpan) {
                nextTimerSpan.textContent = timeLeft;
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.nextTimerInterval);
                this.showScreen('waitingScreen');
            }
        }, 1000);
    }

    async showFinalScreen() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        if (this.nextTimerInterval) {
            clearInterval(this.nextTimerInterval);
        }
        
        this.showScreen('finalScreen');
        
        // Buscar ranking final
        const scoresSnapshot = await db.collection(`rooms/${this.room.id}/scores`)
            .orderBy('totalScore', 'desc')
            .limit(10)
            .get();
        
        const rankings = [];
        scoresSnapshot.forEach(doc => {
            rankings.push({ id: doc.id, ...doc.data() });
        });
        
        this.updateFinalRanking(rankings);
    }

    updateFinalRanking(rankings) {
        const list = document.getElementById('finalRankingList');
        if (!list) return;
        
        if (rankings.length === 0) {
            list.innerHTML = '<p class="placeholder">Nenhum jogador</p>';
            return;
        }
        
        list.innerHTML = rankings.map((player, index) => `
            <div class="ranking-item ${player.playerId === this.playerId ? 'current-player' : ''}">
                <div class="ranking-position">${index + 1}º</div>
                <div class="player-info">
                    <span class="player-avatar">${Utils.getAvatarEmoji(player.avatar)}</span>
                    <span>${this.escapeHtml(player.playerName)}</span>
                </div>
                <div class="ranking-score">${player.totalScore || 0} pts</div>
            </div>
        `).join('');
    }

    updateWaitingPlayers(snapshot) {
        const list = document.getElementById('waitingPlayersList');
        if (!list) return;
        
        const players = [];
        snapshot.forEach(doc => {
            players.push({ id: doc.id, ...doc.data() });
        });
        
        if (players.length === 0) {
            list.innerHTML = '<p class="placeholder">Aguardando jogadores...</p>';
            return;
        }
        
        list.innerHTML = players.map(player => `
            <div class="player-item-mini">
                <span class="player-avatar-mini">${Utils.getAvatarEmoji(player.avatar)}</span>
                <span>${this.escapeHtml(player.playerName)}</span>
            </div>
        `).join('');
    }

    showScreen(screenId) {
        this.currentScreen = screenId;
        document.querySelectorAll('.player-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        if (this.roomUnsubscribe) this.roomUnsubscribe();
        if (this.scoresUnsubscribe) this.scoresUnsubscribe();
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.nextTimerInterval) clearInterval(this.nextTimerInterval);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.playerManager = new PlayerManager();
    
    window.addEventListener('beforeunload', () => {
        if (window.playerManager) {
            window.playerManager.cleanup();
        }
    });
});