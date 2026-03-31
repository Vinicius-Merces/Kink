// Configuração do Firebase - KINK Platform
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar serviços
const auth = firebase.auth();
const db = firebase.firestore();

// Storage opcional (não é obrigatório)
let storage = null;
if (typeof firebase.storage === 'function') {
    storage = firebase.storage();
}

// Utilitários
function generateRoomCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

function isValidRoomCode(code) {
    return /^[A-Z0-9]{6}$/.test(code);
}

// Exportar para uso global
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.storage = storage;
window.generateRoomCode = generateRoomCode;
window.isValidRoomCode = isValidRoomCode;
