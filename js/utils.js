// Utilitários Gerais
class Utils {
    static formatTime(seconds) {
        return `${Math.floor(seconds)}s`;
    }
    
    static formatDate(timestamp) {
        if (!timestamp) return 'Data inválida';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR');
    }
    
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    static shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    static calculatePoints(timeRemaining, timeLimit, isCorrect) {
        if (!isCorrect) return 0;
        const percentage = Math.max(0, Math.min(1, timeRemaining / timeLimit));
        return Math.floor(1000 * percentage);
    }
    
    static getAvatarEmoji(avatarId) {
        const avatars = {
            'avatar1': '🐱', 'avatar2': '🐶', 'avatar3': '🦊', 'avatar4': '🐼',
            'avatar5': '🐨', 'avatar6': '🐸', 'avatar7': '🐙', 'avatar8': '🦄'
        };
        return avatars[avatarId] || '👤';
    }
    
    static getRandomAvatar() {
        const avatars = ['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7', 'avatar8'];
        return avatars[Math.floor(Math.random() * avatars.length)];
    }
    
    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Estilos do toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        font-size: 14px;
        pointer-events: none;
    }
    .toast.show { transform: translateX(0); }
    .toast-success { background: #48bb78; border-left: 4px solid #38a169; }
    .toast-error { background: #f56565; border-left: 4px solid #e53e3e; }
    .toast-warning { background: #ed8936; border-left: 4px solid #dd6b20; }
    .toast-info { background: #4299e1; border-left: 4px solid #3182ce; }
`;
document.head.appendChild(toastStyles);

window.Utils = Utils;