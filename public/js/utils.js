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
        // Criar elemento toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Animação
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Remover após 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    static calculatePoints(timeRemaining, timeLimit, isCorrect) {
        if (!isCorrect) return 0;
        const percentage = timeRemaining / timeLimit;
        return Math.floor(1000 * percentage);
    }
    
    static getAvatarEmoji(avatarId) {
        const avatars = {
            'avatar1': '🐱',
            'avatar2': '🐶',
            'avatar3': '🦊',
            'avatar4': '🐼',
            'avatar5': '🐨',
            'avatar6': '🐸',
            'avatar7': '🐙',
            'avatar8': '🦄'
        };
        return avatars[avatarId] || '👤';
    }
    
    static getRandomAvatar() {
        const avatars = ['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7', 'avatar8'];
        return avatars[Math.floor(Math.random() * avatars.length)];
    }
}

// Adicionar estilos de toast dinamicamente
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
    
    .toast.show {
        transform: translateX(0);
    }
    
    .toast-success {
        background: #48bb78;
        border-left: 4px solid #38a169;
    }
    
    .toast-error {
        background: #f56565;
        border-left: 4px solid #e53e3e;
    }
    
    .toast-warning {
        background: #ed8936;
        border-left: 4px solid #dd6b20;
    }
`;
document.head.appendChild(toastStyles);

// Exportar para uso global
window.Utils = Utils;