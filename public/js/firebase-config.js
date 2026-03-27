// Configuração do Firebase - KINK Platform
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar serviços
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configuração para persistência offline
db.enablePersistence()
  .catch((err) => {
    console.log("KINK: Erro na persistência offline:", err);
  });

// Utilitário para gerar código de sala (estilo KINK)
function generateRoomCode() {
  const prefixes = ['K', 'NK', 'INK'];
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return (prefix + randomPart).substring(0, 6);
}

// Utilitário para validar código
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

// Console branding (easter egg)
console.log("%c🔥 KINK is not Kahoot 🔥", "color: #ff6b6b; font-size: 16px; font-weight: bold;");
console.log("%cThe rebellious quiz platform is ready!", "color: #4ecdc4; font-size: 12px;");