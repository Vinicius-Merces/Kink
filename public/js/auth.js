// Sistema de Autenticação KINK
class AuthManager {
    constructor() {
        this.user = null;
        this.setupListeners();
        this.setupUI();
    }

    setupListeners() {
        // Ouvir mudanças no estado de autenticação
        auth.onAuthStateChanged((user) => {
            this.user = user;
            this.updateUI();
            
            // Disparar evento personalizado
            const event = new CustomEvent('authStateChanged', { detail: { user } });
            document.dispatchEvent(event);
        });
    }

    setupUI() {
        // Fechar modais ao clicar fora
        window.addEventListener('click', (e) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Setup dos modais na página inicial
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            this.setupIndexPageModals();
        }
    }

    setupIndexPageModals() {
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        
        if (!loginModal || !registerModal) return;

        // Botão de login
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                loginModal.style.display = 'block';
            });
        }

        // Botão de criar conta (se existir)
        const showRegister = document.getElementById('showRegister');
        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                loginModal.style.display = 'none';
                registerModal.style.display = 'block';
            });
        }

        // Formulário de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email')?.value;
                const password = document.getElementById('password')?.value;
                
                if (!email || !password) {
                    Utils.showToast('Preencha todos os campos', 'warning');
                    return;
                }
                
                const result = await this.login(email, password);
                if (result.success) {
                    loginModal.style.display = 'none';
                    Utils.showToast(`Bem-vindo de volta, ${result.user.displayName || result.user.email}!`, 'success');
                    setTimeout(() => {
                        window.location.href = 'my-quizzes.html';
                    }, 500);
                } else {
                    Utils.showToast(result.error, 'error');
                }
            });
        }

        // Login com Google
        const googleLogin = document.getElementById('googleLogin');
        if (googleLogin) {
            googleLogin.addEventListener('click', async () => {
                const result = await this.loginWithGoogle();
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

        // Formulário de registro
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('regName')?.value;
                const email = document.getElementById('regEmail')?.value;
                const password = document.getElementById('regPassword')?.value;
                
                if (!name || !email || !password) {
                    Utils.showToast('Preencha todos os campos', 'warning');
                    return;
                }
                
                if (password.length < 6) {
                    Utils.showToast('A senha deve ter pelo menos 6 caracteres', 'warning');
                    return;
                }
                
                const result = await this.register(name, email, password);
                if (result.success) {
                    registerModal.style.display = 'none';
                    Utils.showToast(`Conta criada com sucesso! Bem-vindo, ${name}!`, 'success');
                    setTimeout(() => {
                        window.location.href = 'my-quizzes.html';
                    }, 500);
                } else {
                    Utils.showToast(result.error, 'error');
                }
            });
        }
    }

    // Login com email e senha
    async login(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            return {
                success: true,
                user: result.user
            };
        } catch (error) {
            console.error('Erro no login:', error);
            let errorMessage = 'Erro ao fazer login';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuário não encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Senha incorreta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'E-mail inválido';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Usuário desabilitado';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
                    break;
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    // Registro com email e senha
    async register(name, email, password) {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            
            // Atualizar perfil com nome
            await result.user.updateProfile({
                displayName: name
            });
            
            // Salvar informações adicionais no Firestore
            await db.collection('users').doc(result.user.uid).set({
                uid: result.user.uid,
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                quizzesCreated: 0,
                totalPlays: 0
            });
            
            return {
                success: true,
                user: result.user
            };
        } catch (error) {
            console.error('Erro no registro:', error);
            let errorMessage = 'Erro ao criar conta';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este e-mail já está em uso';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'E-mail inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Registro não habilitado';
                    break;
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    // Login com Google
    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            const result = await auth.signInWithPopup(provider);
            
            // Verificar se é novo usuário para salvar no Firestore
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
            
            return {
                success: true,
                user: result.user
            };
        } catch (error) {
            console.error('Erro no login com Google:', error);
            let errorMessage = 'Erro ao fazer login com Google';
            
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Login cancelado';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Pop-up bloqueado. Permita pop-ups para este site';
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    // Logout
    async logout() {
        try {
            await auth.signOut();
            Utils.showToast('Logout realizado com sucesso!', 'success');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Erro no logout:', error);
            Utils.showToast('Erro ao fazer logout', 'error');
        }
    }

    // Recuperar senha
    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            Utils.showToast('E-mail de recuperação enviado!', 'success');
            return { success: true };
        } catch (error) {
            console.error('Erro ao recuperar senha:', error);
            let errorMessage = 'Erro ao enviar e-mail de recuperação';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'Usuário não encontrado';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'E-mail inválido';
            }
            
            Utils.showToast(errorMessage, 'error');
            return { success: false, error: errorMessage };
        }
    }

    // Atualizar perfil do usuário
    async updateProfile(data) {
        if (!this.user) return { success: false, error: 'Usuário não autenticado' };
        
        try {
            if (data.displayName) {
                await this.user.updateProfile({
                    displayName: data.displayName
                });
            }
            
            if (data.photoURL) {
                await this.user.updateProfile({
                    photoURL: data.photoURL
                });
            }
            
            // Atualizar no Firestore
            await db.collection('users').doc(this.user.uid).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.showToast('Perfil atualizado!', 'success');
            return { success: true };
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            Utils.showToast('Erro ao atualizar perfil', 'error');
            return { success: false, error: error.message };
        }
    }

    // Obter informações do usuário
    async getUserInfo(uid = null) {
        const userId = uid || (this.user ? this.user.uid : null);
        if (!userId) return null;
        
        try {
            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists) {
                return { uid: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            return null;
        }
    }

    // Atualizar UI baseado no estado de autenticação
    updateUI() {
        const userNameElements = document.querySelectorAll('#userName');
        const userAvatarElements = document.querySelectorAll('.user-avatar');
        const authRequiredElements = document.querySelectorAll('.auth-required');
        const authOptionalElements = document.querySelectorAll('.auth-optional');
        
        if (this.user) {
            // Usuário logado
            const displayName = this.user.displayName || this.user.email.split('@')[0];
            
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
            
            authRequiredElements.forEach(el => {
                el.style.display = 'block';
            });
            
            authOptionalElements.forEach(el => {
                el.style.display = 'none';
            });
            
        } else {
            // Usuário não logado
            userNameElements.forEach(el => {
                el.style.display = 'none';
            });
            
            userAvatarElements.forEach(el => {
                el.style.display = 'none';
            });
            
            authRequiredElements.forEach(el => {
                el.style.display = 'none';
            });
            
            authOptionalElements.forEach(el => {
                el.style.display = 'block';
            });
        }
    }

    // Verificar se está logado (redireciona se não estiver)
    requireAuth(redirectTo = 'index.html') {
        if (!this.user) {
            Utils.showToast('Você precisa estar logado para acessar esta página', 'warning');
            setTimeout(() => {
                window.location.href = redirectTo;
            }, 1000);
            return false;
        }
        return true;
    }

    // Verificar se não está logado (redireciona se estiver)
    requireNoAuth(redirectTo = 'my-quizzes.html') {
        if (this.user) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }
}

// Inicializar AuthManager quando o DOM estiver pronto
let authManager = null;

document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    
    // Configurar botão de logout em todas as páginas
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await authManager.logout();
        });
    }
    
    // Proteger páginas que exigem autenticação
    const protectedPages = ['my-quizzes.html', 'create-quiz.html', 'host.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        auth.onAuthStateChanged((user) => {
            if (!user) {
                Utils.showToast('Faça login para acessar esta página', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        });
    }
});

// Exportar para uso global
window.authManager = authManager;