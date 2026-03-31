// Player - Tela do Aluno (VERSÃO FINAL CORRIGIDA - Pontuação no Header + Pódio Final)
class PlayerManager {
    constructor() {
        this.roomCode = null;
        this.room = null;
        this.playerId = null;
        this.playerName = null;
        this.playerAvatar = null;
        this.currentQuestion = null;
        this.questionStartTime = null;
        this.hasAnswered = false;
        this.currentScreen = 'joinScreen';
        this.roomUnsubscribe = null;
        this.scoresUnsubscribe = null;
        this.readingTimer = null;
        this.answerTimer = null;
        this.currentScore = 0;
        this.streak = 0;
        this.init();
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this.roomCode = urlParams.get('code');
        if (this.roomCode) {
            document.getElementById('roomCodeInput').value = this.roomCode;
            await this.checkRoom();
        }
        this.setupEventListeners();
        this.loadAvatars();
        this.createPlayerHeader();
    }

    // ====================== HEADER FIXO ======================
    createPlayerHeader() {
        if (document.getElementById('playerHeader')) return;

        const headerHTML = `
            <div id="playerHeader" style="position:fixed;top:0;left:0;right:0;background:rgba(15,15,15,0.95);padding:12px 20px;display:flex;align-items:center;justify-content:space-between;z-index:9999;border-bottom:2px solid #ff6b6b;box-shadow:0 2px 10px rgba(0,0,0,0.5);">
                <div style="display:flex;align-items:center;gap:12px;">
                    <span id="playerHeaderAvatar" style="font-size:2rem;"></span>
                    <div>
                        <div id="playerHeaderName" style="font-weight:700;font-size:1.1rem;"></div>
                        <div id="playerHeaderScore" style="color:#ff6b6b;font-size:1.25rem;font-weight:bold;">0 pts</div>
                    </div>
                </div>
                <div id="playerStreak" style="font-size:2rem;display:flex;align-items:center;gap:4px;"></div>
            </div>`;

        document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }

    updatePlayerHeader() {
        document.getElementById('playerHeaderAvatar').textContent = Utils.getAvatarEmoji(this.playerAvatar || 'avatar1');
        document.getElementById('playerHeaderName').textContent = this.playerName || 'Jogador';
        document.getElementById('playerHeaderScore').textContent = `${this.currentScore} pts`;

        const streakEl = document.getElementById('playerStreak');
        if (this.streak >= 2) {
            streakEl.innerHTML = '🔥'.repeat(Math.min(this.streak, 6)) + ` <span style="font-size:1.1rem;">${this.streak}x</span>`;
        } else {
            streakEl.textContent = '';
        }
    }

    setupEventListeners() {
        document.getElementById('checkRoomBtn').addEventListener('click', () => this.checkRoom());
        document.getElementById('joinGameBtn').addEventListener('click', () => this.joinGame());
        document.getElementById('exitGameBtn').addEventListener('click', () => window.location.href = 'index.html');
    }

    loadAvatars() {
        const avatars = [
            { id: 'avatar1', emoji: '🐱' }, { id: 'avatar2', emoji: '🐶' }, { id: 'avatar3', emoji: '🦊' },
            { id: 'avatar4', emoji: '🐼' }, { id: 'avatar5', emoji: '🐨' }, { id: 'avatar6', emoji: '🐸' },
            { id: 'avatar7', emoji: '🐙' }, { id: 'avatar8', emoji: '🦄' }
        ];
        const grid = document.getElementById('avatarsGrid');
        grid.innerHTML = avatars.map(a => `
            <div class="avatar-option" data-avatar="${a.id}">
                <div class="avatar-emoji">${a.emoji}</div>
            </div>
        `).join('');

        document.querySelector('.avatar-option').classList.add('selected');
        this.playerAvatar = 'avatar1';

        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.playerAvatar = opt.dataset.avatar;
            });
        });
    }

    async checkRoom() {
        const code = document.getElementById('roomCodeInput').value.toUpperCase().trim();
        if (code.length !== 6) return Utils.showToast('Código inválido', 'warning');

        try {
            const snapshot = await db.collection('rooms')
                .where('code', '==', code)
                .where('active', '==', true)
                .get();

            if (snapshot.empty) return Utils.showToast('Sala não encontrada ou encerrada', 'error');

            this.room = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            this.roomCode = code;
            this.showScreen('profileScreen');
        } catch (e) {
            Utils.showToast('Erro ao verificar sala', 'error');
        }
    }

    async joinGame() {
        const name = document.getElementById('playerName').value.trim();
        if (!name || !this.playerAvatar) return Utils.showToast('Nome e avatar são obrigatórios', 'warning');

        this.playerId = Utils.generateId();
        this.playerName = name;

        try {
            await db.collection(`rooms/${this.room.id}/players`).doc(this.playerId).set({
                id: this.playerId, name, avatar: this.playerAvatar,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(), status: 'ready'
            });
            await db.collection(`rooms/${this.room.id}/scores`).doc(this.playerId).set({
                playerId: this.playerId, playerName: name, avatar: this.playerAvatar, totalScore: 0
            });

            this.showScreen('waitingScreen');
            document.getElementById('waitingRoomCode').textContent = this.roomCode;
            this.setupGameListeners();
        } catch (error) {
            Utils.showToast('Erro ao entrar na sala', 'error');
        }
    }

    setupGameListeners() {
        this.roomUnsubscribe = db.collection('rooms').doc(this.room.id).onSnapshot((doc) => {
            if (doc.exists) this.handleRoomUpdate(doc.data());
        });

        // Listener forte para atualizar pontuação em tempo real
        this.scoresUnsubscribe = db.collection(`rooms/${this.room.id}/scores`)
            .orderBy('totalScore', 'desc')
            .onSnapshot((snapshot) => {
                let myScore = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.playerId === this.playerId) {
                        myScore = data.totalScore || 0;
                    }
                });
                this.currentScore = myScore;
                this.updatePlayerHeader();

                // Atualiza ranking quando estiver na tela de ranking ou final
                if (this.currentScreen === 'rankingScreen' || this.currentScreen === 'finalScreen') {
                    this.updateRanking(snapshot);
                }
            });
    }

    handleRoomUpdate(roomData) {
        this.room = { ...this.room, ...roomData };
        console.log(`📡 Status recebido: ${roomData.status} | Tela atual: ${this.currentScreen}`);

        switch (roomData.status) {
            case 'loading':
                this.showScreen('loadingScreen');
                this.startLoadingTimer();
                break;
            case 'reading':
                this.handleReadingPhase(roomData);
                break;
            case 'answering':
                this.handleAnsweringPhase(roomData);
                break;
            case 'active':
                if (this.currentScreen === 'questionScreen' || this.currentScreen === 'readingScreen') {
                    this.showRankingAfterQuestion();
                } else {
                    this.showScreen('waitingScreen');
                }
                break;
            case 'finished':
                this.showFinalScreen();
                break;
        }
    }

    startLoadingTimer() {
        const timerEl = document.getElementById('loadingTimer');
        if (!timerEl) return;
        let time = 5;
        timerEl.textContent = time;
        const interval = setInterval(() => {
            time--;
            timerEl.textContent = time;
            if (time <= 0) clearInterval(interval);
        }, 1000);
    }

    handleReadingPhase(roomData) {
        const qData = roomData.currentQuestionData;
        if (!qData) return;

        this.currentQuestion = {
            index: roomData.currentQuestionIndex,
            text: qData.text,
            options: qData.options,
            timeLimit: qData.timeLimit,
            correct: qData.correct
        };

        this.hasAnswered = false;
        this.showScreen('readingScreen');
        document.getElementById('readingQuestionText').textContent = this.currentQuestion.text;

        let timeLeft = 5;
        const timerEl = document.getElementById('readingTimer');
        if (timerEl) timerEl.textContent = timeLeft;

        if (this.readingTimer) clearInterval(this.readingTimer);
        this.readingTimer = setInterval(() => {
            timeLeft--;
            if (timerEl) timerEl.textContent = timeLeft;
            if (timeLeft <= 0) clearInterval(this.readingTimer);
        }, 1000);
    }

    handleAnsweringPhase(roomData) {
        const qData = roomData.currentQuestionData;
        if (!qData) return;

        this.currentQuestion = {
            index: roomData.currentQuestionIndex,
            text: qData.text,
            options: qData.options,
            timeLimit: qData.timeLimit,
            correct: qData.correct
        };

        this.questionStartTime = new Date();
        this.hasAnswered = false;

        this.showScreen('questionScreen');
        this.displayQuestion();
        this.startQuestionTimer();
    }

    displayQuestion() {
        document.getElementById('questionText').textContent = this.currentQuestion.text;
        const grid = document.getElementById('optionsGrid');
        const letters = ['A','B','C','D','E','F'];

        grid.innerHTML = this.currentQuestion.options.map((opt, i) => `
            <button class="option-btn" data-option="${i}">
                <div class="option-letter">${letters[i]}</div>
                <div class="option-text">${Utils.escapeHtml(opt)}</div>
            </button>
        `).join('');

        grid.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.hasAnswered) this.submitAnswer(parseInt(btn.dataset.option));
            });
        });
    }

    startQuestionTimer() {
        const timerValue = document.getElementById('timerValue');
        let timeLeft = this.currentQuestion.timeLimit;

        if (this.answerTimer) clearInterval(this.answerTimer);

        this.answerTimer = setInterval(() => {
            timeLeft--;
            timerValue.textContent = Math.max(0, timeLeft);
            if (timeLeft <= 0) {
                clearInterval(this.answerTimer);
                if (!this.hasAnswered) this.submitAnswer(null);
            }
        }, 1000);
    }

    async submitAnswer(selectedOption) {
        if (this.hasAnswered) return;
        this.hasAnswered = true;
        if (this.answerTimer) clearInterval(this.answerTimer);

        const responseTime = (new Date() - this.questionStartTime) / 1000;
        const isCorrect = selectedOption === this.currentQuestion.correct;

        this.currentQuestion.lastAnswerCorrect = isCorrect;

        try {
            await db.collection(`rooms/${this.room.id}/answers`)
                .doc(`${this.currentQuestion.index}_${this.playerId}`)
                .set({
                    playerId: this.playerId,
                    playerName: this.playerName,
                    avatar: this.playerAvatar,
                    questionIndex: this.currentQuestion.index,
                    answer: selectedOption,
                    responseTime: responseTime,
                    isCorrect: isCorrect,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.disabled = true;
                btn.classList.add('disabled');
                if (parseInt(btn.dataset.option) === selectedOption) btn.style.borderColor = '#ff6b6b';
            });
        } catch (e) {
            console.error(e);
        }
    }

    showRankingAfterQuestion() {
        this.showScreen('rankingScreen');
        this.showAnswerFeedback();
        setTimeout(() => this.updateRankingFromFirestore(), 300);
        this.updatePlayerHeader();
    }

    showAnswerFeedback() {
        const feedbackDiv = document.getElementById('answerFeedback');
        if (!feedbackDiv || !this.currentQuestion) return;

        const isCorrect = this.currentQuestion.lastAnswerCorrect;

        if (isCorrect) this.streak++;
        else this.streak = 0;

        feedbackDiv.innerHTML = isCorrect 
            ? `<div class="feedback correct">✅ Parabéns! Você acertou!</div>`
            : `<div class="feedback incorrect">❌ Você errou esta pergunta</div>`;

        feedbackDiv.style.display = 'block';
    }

    async updateRankingFromFirestore() {
        const container = document.getElementById('rankingListModal');
        if (!container) return;

        try {
            const snapshot = await db.collection(`rooms/${this.room.id}/scores`)
                .orderBy('totalScore', 'desc')
                .limit(10)
                .get();

            const rankings = [];
            snapshot.forEach(doc => rankings.push(doc.data()));

            container.innerHTML = rankings.map((player, index) => `
                <div class="ranking-item ${player.playerId === this.playerId ? 'current-player' : ''}">
                    <div class="ranking-position">${index + 1}º</div>
                    <div class="player-info">
                        <span class="player-avatar">${Utils.getAvatarEmoji(player.avatar)}</span>
                        <span>${Utils.escapeHtml(player.playerName)}</span>
                    </div>
                    <div class="ranking-score">${player.totalScore || 0} pts</div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Erro ao carregar ranking:', err);
        }
    }

    showFinalScreen() {
        this.showScreen('finalScreen');
        this.updatePlayerHeader();
        this.updateFinalRanking();
    }

    async updateFinalRanking() {
        const container = document.getElementById('finalRankingList');
        if (!container) return;

        try {
            const snapshot = await db.collection(`rooms/${this.room.id}/scores`)
                .orderBy('totalScore', 'desc')
                .limit(10)
                .get();

            const rankings = [];
            snapshot.forEach(doc => rankings.push(doc.data()));

            container.innerHTML = rankings.map((player, index) => `
                <div class="ranking-item ${player.playerId === this.playerId ? 'current-player' : ''}">
                    <div class="ranking-position">${index + 1}º</div>
                    <div class="player-info">
                        <span class="player-avatar">${Utils.getAvatarEmoji(player.avatar)}</span>
                        <span>${Utils.escapeHtml(player.playerName)}</span>
                    </div>
                    <div class="ranking-score">${player.totalScore || 0} pts</div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Erro ao carregar pódio final:', err);
        }
    }

    showScreen(screenId) {
        this.currentScreen = screenId;
        document.querySelectorAll('.player-screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
        else console.error(`Tela não encontrada: ${screenId}`);
    }

    cleanup() {
        if (this.roomUnsubscribe) this.roomUnsubscribe();
        if (this.scoresUnsubscribe) this.scoresUnsubscribe();
        if (this.readingTimer) clearInterval(this.readingTimer);
        if (this.answerTimer) clearInterval(this.answerTimer);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.playerManager = new PlayerManager();
    window.addEventListener('beforeunload', () => window.playerManager?.cleanup());
});