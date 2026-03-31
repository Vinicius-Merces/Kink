// Sistema de Autenticação KINK - Versão Simplificada (Apenas Google)
class AuthManager {
    constructor() {
        this.user = null;
        this.setupListeners();
        this.setupUI();
    }

    setupListeners() {
        auth.onAuthStateChanged((user) => {
            this.user = user;
            this.updateUI();
            
            const event = new CustomEvent('authStateChanged', { detail: { user } });
            document.dispatchEvent(event);
        });
    }

    setupUI() {
        // Fechar modais ao clicar no X ou fora
        window.addEventListener('click', (e) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (e.target === modal || e.target.classList.contains('close')) {
                    modal.style.display = 'none';
                }
            });
        });

        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            this.setupIndexPageModals();
        }
    }

    setupIndexPageModals() {
        const loginModal = document.getElementById('loginModal');
        
        if (!loginModal) return;

        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                loginModal.style.display = 'block';
            });
        }

        // Botão de login com Google
        const googleLogin = document.getElementById('googleLogin');
        if (googleLogin) {
            googleLogin.addEventListener('click', async () => {
                // Mostrar loading
                googleLogin.disabled = true;
                googleLogin.textContent = '🔄 Entrando...';
                
                const result = await this.loginWithGoogle();
                
                googleLogin.disabled = false;
                googleLogin.textContent = 'Entrar com Google';
                
                if (result.success) {
                    loginModal.style.display = 'none';
                    Utils.showToast(`Bem-vindo, ${result.user.displayName}!`, 'success');
                    setTimeout(() => {
                        window.location.href = 'my-quizzes.html';
                    }, 500);
                } else {
                    Utils.showToast(result.error, 'error');
                }
            });
        }

        // Botão de fechar manual (garantir)
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });
    }

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ 
                prompt: 'select_account'
            });
            
            const result = await auth.signInWithPopup(provider);
            
            if (result.additionalUserInfo.isNewUser) {
                await db.collection('users').doc(result.user.uid).set({
                    uid: result.user.uid,
                    name: result.user.displayName,
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    quizzesCreated: 0,
                    totalPlays: 0
                });
            }
            
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Erro no login com Google:', error);
            let errorMessage = 'Erro ao fazer login com Google';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Login cancelado';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Pop-up bloqueado. Permita pop-ups para este site';
            } else if (error.code === 'auth/unauthorized-domain') {
                errorMessage = 'Domínio não autorizado. Contate o administrador.';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    async logout() {
        try {
            await auth.signOut();
            Utils.showToast('Logout realizado com sucesso!', 'success');
            window.location.href = 'index.html';
        } catch (error) {
            Utils.showToast('Erro ao fazer logout', 'error');
        }
    }

    updateUI() {
        const userNameElements = document.querySelectorAll('#userName');
        const userAvatarElements = document.querySelectorAll('.user-avatar');
        
        if (this.user) {
            const displayName = this.user.displayName || this.user.email?.split('@')[0] || 'Usuário';
            userNameElements.forEach(el => {
                el.textContent = displayName;
                el.style.display = 'inline';
            });
            userAvatarElements.forEach(el => {
                if (this.user.photoURL) {
                    el.innerHTML = `<img src="${this.user.photoURL}" alt="avatar">`;
                } else {
                    el.innerHTML = displayName.charAt(0).toUpperCase();
                }
                el.style.display = 'flex';
            });
        } else {
            userNameElements.forEach(el => el.style.display = 'none');
            userAvatarElements.forEach(el => el.style.display = 'none');
        }
    }

    requireAuth(redirectTo = 'index.html') {
        if (!this.user) {
            Utils.showToast('Você precisa estar logado para acessar esta página', 'warning');
            setTimeout(() => window.location.href = redirectTo, 1000);
            return false;
        }
        return true;
    }
}

let authManager = null;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => await authManager.logout());
    }
    
    const protectedPages = ['my-quizzes.html', 'create-quiz.html', 'host.html'];
    const currentPage = window.location.pathname.split('/').pop();
    if (protectedPages.includes(currentPage)) {
        auth.onAuthStateChanged((user) => {
            if (!user) {
                Utils.showToast('Faça login para acessar esta página', 'warning');
                setTimeout(() => window.location.href = 'index.html', 1000);
            }
        });
    }
});

window.authManager = authManager;
