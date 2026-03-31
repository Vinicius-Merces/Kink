// Music Player - KINK Style (Playlists Separadas por Página)
class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.volume = 0.6;
        this.playlist = [];
        this.currentPlaylist = [];
        this.playlistType = 'menu';
        this.init();
    }

    init() {
        this.detectPageType();
        this.loadPlaylist();
        this.setupAudioEvents();
        this.createPlayerUI();
        this.setupKeyboardShortcuts();
        this.setupAutoPlay();
    }

    detectPageType() {
        const path = window.location.pathname.toLowerCase();
        this.playlistType = (path.includes('host.html') || path.includes('player.html')) ? 'game' : 'menu';
        console.log(`🎵 MusicPlayer: Modo ${this.playlistType} detectado`);
    }

    loadPlaylist() {
        const menuPlaylist = [
            { id: 'menu1', title: 'KINK Theme', artist: 'KINK Original', url: '/assets/music/Index/KINK - Ta pronto pro jogo.mp3', cover: '🎵', duration: '2:34' },
            { id: 'menu2', title: 'Rebel Rhythm', artist: 'KINK Original', url: '/assets/music/Index/KINK - EletroVibe.mp3', cover: '⚡', duration: '2:09' },
            { id: 'menu3', title: 'Yeah! KINK', artist: 'KINK Original', url: '/assets/music/Index/KINK - Yeah!.mp3', cover: '⚛️', duration: '2:24' },
            { id: 'menu4', title: 'Just KINK', artist: 'KINK Original', url: '/assets/music/Index/KINK - Pulsating Vibe.mp3', cover: '⚛️', duration: '2:13' }
        ];
        const gamePlaylist = [
            { id: 'game1', title: 'Epic Tension', artist: 'KINK Original', url: '/assets/music/instrumental/KINK - Play! 2.mp3', cover: '⚡', duration: '2:51' },
            { id: 'game2', title: 'Quiz Pulse', artist: 'KINK Original', url: '/assets/music/instrumental/KINK - Quiz Lobby Cipher 2.mp3', cover: '🎯', duration: '2:16' },
            { id: 'game3', title: 'Background Lo-Fi', artist: 'KINK Original', url: '/assets/music/instrumental/KINK - Lofi Session.mp3', cover: '🎷🎼', duration: '2:08' },
            { id: 'game4', title: 'Quizz Lo-Fi', artist: 'KINK Original', url: '/assets/music/instrumental/KINK - Lofi Session 2.mp3', cover: '🎹🎸', duration: '1:48' },
            { id: 'game5', title: 'Epic Suspense', artist: 'KINK Original', url: '/assets/music/instrumental/KINK - Dark drama.mp3', cover: '🎹', duration: '1:50' },
            { id: 'game6', title: 'Epic Answers', artist: 'KINK Original', url: '/assets/music/instrumental/KINK - Play!.mp3', cover: '☯️', duration: '2:42' },
            { id: 'game7', title: 'KINK Drama', artist: 'KINK Original', url: '/assets/music/instrumental/KINK - Dark drama 2.mp3', cover: '⚛️', duration: '2:14' },
            { id: 'game8', title: 'Be KINK', artist: 'KINK Original', url: '/assets/music/instrumental/KINK - Quiz Lobby Cipher.mp3', cover: '🪯', duration: '1:36' }
        ];
        this.currentPlaylist = (this.playlistType === 'game') ? gamePlaylist : menuPlaylist;

        const savedVolume = localStorage.getItem('kink_volume');
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
            this.audio.volume = this.volume;
        }

        const lastTrackKey = `kink_last_track_${this.playlistType}`;
        const lastTrack = localStorage.getItem(lastTrackKey);
        this.currentTrackIndex = (lastTrack !== null && lastTrack < this.currentPlaylist.length) ? parseInt(lastTrack) : 0;
    }

    setupAudioEvents() {
        this.audio.addEventListener('ended', () => this.nextTrack());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('play', () => localStorage.setItem('kink_was_playing', 'true'));
        this.audio.addEventListener('pause', () => localStorage.setItem('kink_was_playing', 'false'));
    }

    setupAutoPlay() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
        }).catch(() => {
            console.log('🎵 Auto-play bloqueado. Aguardando interação...');
            const startOnClick = () => {
                this.play();
                document.removeEventListener('click', startOnClick);
                document.removeEventListener('touchstart', startOnClick);
            };
            document.addEventListener('click', startOnClick);
            document.addEventListener('touchstart', startOnClick);
        });
    }

    updatePlayButton() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const player = document.getElementById('kinkMusicPlayer');
        if (playPauseBtn) playPauseBtn.innerHTML = this.isPlaying ? '⏸️' : '▶️';
        if (player) {
            if (this.isPlaying) {
                player.classList.remove('paused');
                player.classList.add('playing');
            } else {
                player.classList.remove('playing');
                player.classList.add('paused');
            }
        }
    }

    createPlayerUI() {
        if (document.getElementById('kinkMusicPlayer')) return;

        const playerHTML = `
            <div id="kinkMusicPlayer" class="music-player ${this.isPlaying ? 'playing' : 'paused'}">
                <div class="player-toggle" id="playerToggle">
                    <div class="player-icon" id="playPauseBtn"><span>${this.isPlaying ? '⏸️' : '▶️'}</span></div>
                    <div class="player-info">
                        <div class="player-title" id="currentTitle">Carregando...</div>
                        <div class="player-artist" id="currentArtist">KINK Music</div>
                    </div>
                    <div class="player-controls">
                        <button id="prevBtn" title="Anterior (←)">⏮️</button>
                        <button id="nextBtn" title="Próxima (→)">⏭️</button>
                        <button id="playlistBtn" title="Playlist">📋</button>
                        <button id="minimizeBtn" class="minimize-btn" title="Minimizar">🗕</button>
                    </div>
                    <div class="player-volume">
                        <span class="player-volume-icon" id="volumeIcon">🔊</span>
                        <input type="range" id="volumeSlider" min="0" max="1" step="0.01" value="${this.volume}">
                    </div>
                </div>
                <div id="playlistPanel" class="playlist-panel">
                    <div class="playlist-header">
                        <h4>${this.playlistType === 'game' ? '🎮 Playlist de Jogo (Instrumental)' : '🎵 Playlist KINK'}</h4>
                        <span class="playlist-close" id="closePlaylist">✕</span>
                    </div>
                    <div class="playlist-list" id="playlistList"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', playerHTML);
        this.bindEvents();
        this.renderPlaylist();
        this.loadTrack(this.currentTrackIndex);
    }

    bindEvents() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const playlistBtn = document.getElementById('playlistBtn');
        const closePlaylist = document.getElementById('closePlaylist');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeIcon = document.getElementById('volumeIcon');
        const minimizeBtn = document.getElementById('minimizeBtn');
        const player = document.getElementById('kinkMusicPlayer');

        if (playPauseBtn) playPauseBtn.addEventListener('click', () => this.togglePlay());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevTrack());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextTrack());
        if (playlistBtn) playlistBtn.addEventListener('click', () => this.togglePlaylist());
        if (closePlaylist) closePlaylist.addEventListener('click', () => this.togglePlaylist(false));
        if (volumeSlider) volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        if (volumeIcon) volumeIcon.addEventListener('click', () => this.toggleMute());
        if (minimizeBtn) minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMinimize();
        });
        if (player) player.addEventListener('click', (e) => {
            if (player.classList.contains('minimized') && e.target === player) {
                this.toggleMinimize();
            }
        });
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('playlistPanel');
            const btn = document.getElementById('playlistBtn');
            if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
                panel.classList.remove('show');
            }
        });
    }

    // ========== MINIMIZAR / EXPANDIR (CORRIGIDO) ==========
    toggleMinimize() {
        const player = document.getElementById('kinkMusicPlayer');
        if (!player) return;

        const isMinimized = player.classList.contains('minimized');
        
        if (!isMinimized) {
            // ---- MINIMIZAR ----
            player.classList.add('minimized');
            // Criar botão expandir
            const expandBtn = document.createElement('button');
            expandBtn.id = 'expandBtn';
            expandBtn.className = 'expand-btn';
            expandBtn.innerHTML = '◀';  // seta para a esquerda indicando expandir
            expandBtn.title = 'Expandir';
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMinimize();
            });
            player.appendChild(expandBtn);
            // Atualizar tooltip
            const currentTrack = this.currentPlaylist[this.currentTrackIndex];
            player.setAttribute('data-tooltip', `${currentTrack.title} - ${currentTrack.artist || 'KINK'}`);
        } else {
            // ---- EXPANDIR ----
            player.classList.remove('minimized');
            // Remover botão expandir
            const expandBtn = document.getElementById('expandBtn');
            if (expandBtn) expandBtn.remove();
            player.removeAttribute('data-tooltip');
        }
    }

    renderPlaylist() {
        const playlistList = document.getElementById('playlistList');
        if (!playlistList) return;
        playlistList.innerHTML = this.currentPlaylist.map((track, index) => `
            <div class="playlist-item ${index === this.currentTrackIndex ? 'active' : ''}" data-index="${index}">
                <div class="playlist-item-cover">${track.cover || '🎵'}</div>
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${track.title}</div>
                    <div class="playlist-item-artist">${track.artist}</div>
                </div>
                <div class="playlist-item-duration">${track.duration || '--:--'}</div>
            </div>
        `).join('');
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.playTrack(index);
                this.togglePlaylist(false);
            });
        });
    }

    loadTrack(index) {
        if (!this.currentPlaylist[index]) return;
        const track = this.currentPlaylist[index];
        this.currentTrackIndex = index;
        this.audio.src = track.url;
        this.audio.load();
        document.getElementById('currentTitle').textContent = track.title;
        document.getElementById('currentArtist').textContent = track.artist || 'KINK';
        
        const player = document.getElementById('kinkMusicPlayer');
        if (player && player.classList.contains('minimized')) {
            player.setAttribute('data-tooltip', `${track.title} - ${track.artist || 'KINK'}`);
        }
        localStorage.setItem(`kink_last_track_${this.playlistType}`, index);
        this.renderPlaylist();
        if (this.isPlaying) this.audio.play().catch(() => {});
    }

    playTrack(index) {
        this.loadTrack(index);
        this.play();
    }

    togglePlay() {
        this.isPlaying ? this.pause() : this.play();
    }

    play() {
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            localStorage.setItem('kink_was_playing', 'true');
        }).catch(e => console.log('Erro ao reproduzir:', e));
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        localStorage.setItem('kink_was_playing', 'false');
    }

    nextTrack() {
        let next = this.currentTrackIndex + 1;
        if (next >= this.currentPlaylist.length) next = 0;
        this.playTrack(next);
    }

    prevTrack() {
        let prev = this.currentTrackIndex - 1;
        if (prev < 0) prev = this.currentPlaylist.length - 1;
        this.playTrack(prev);
    }

    setVolume(value) {
        this.volume = parseFloat(value);
        this.audio.volume = this.volume;
        localStorage.setItem('kink_volume', this.volume);
        const volumeIcon = document.getElementById('volumeIcon');
        if (volumeIcon) {
            if (this.volume === 0) volumeIcon.textContent = '🔇';
            else if (this.volume < 0.3) volumeIcon.textContent = '🔈';
            else if (this.volume < 0.7) volumeIcon.textContent = '🔉';
            else volumeIcon.textContent = '🔊';
        }
    }

    toggleMute() {
        if (this.volume > 0) {
            this.lastVolume = this.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.lastVolume || 0.5);
        }
    }

    togglePlaylist(show) {
        const panel = document.getElementById('playlistPanel');
        if (panel) {
            if (show === undefined) panel.classList.toggle('show');
            else show ? panel.classList.add('show') : panel.classList.remove('show');
        }
    }

    updateProgress() {}
    updateDuration() {}

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch(e.key) {
                case ' ': e.preventDefault(); this.togglePlay(); break;
                case 'ArrowRight': e.preventDefault(); this.nextTrack(); break;
                case 'ArrowLeft': e.preventDefault(); this.prevTrack(); break;
                case 'ArrowUp': e.preventDefault(); this.setVolume(Math.min(1, this.volume + 0.1)); break;
                case 'ArrowDown': e.preventDefault(); this.setVolume(Math.max(0, this.volume - 0.1)); break;
            }
        });
    }

    reloadPlaylist() {
        this.detectPageType();
        this.loadPlaylist();
        this.currentTrackIndex = 0;
        this.loadTrack(0);
        this.renderPlaylist();
        const playlistHeader = document.querySelector('#playlistPanel h4');
        if (playlistHeader) {
            playlistHeader.textContent = this.playlistType === 'game' ? '🎮 Playlist de Jogo (Instrumental)' : '🎵 Playlist KINK';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.musicPlayer = new MusicPlayer();
    }, 200);
});