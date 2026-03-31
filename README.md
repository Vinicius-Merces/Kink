# 🔥 KINK is not Kahoot

*The rebellious quiz platform that breaks all the rules*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

## 🎯 Sobre o Projeto

**KINK is not Kahoot** é uma plataforma de quizzes interativa em tempo real, criada como alternativa ao Kahoot, sem limites de caracteres e com total liberdade para professores e alunos.

**Desenvolvido como projeto de portfólio** para demonstrar habilidades em:
- Firebase (Auth, Firestore)
- JavaScript puro (Vanilla JS)
- HTML5/CSS3 com design responsivo e animações
- Arquitetura em tempo real com listeners do Firestore
- Player de música com playlists dinâmicas (separadas por página)
- Sistema de pontuação baseado em velocidade

## ✨ Funcionalidades

### Para Professores (Hosts)
- ✅ Login com Google (apenas)
- ✅ Criar quizzes ilimitados (sem restrição de caracteres)
- ✅ Adicionar perguntas com 4+ opções e tempo personalizado
- ✅ Editar, excluir e listar quizzes
- ✅ Iniciar sessão ao vivo com código de 6 dígitos
- ✅ Ver jogadores conectados em tempo real
- ✅ Controlar o fluxo do jogo:
  - Fase de leitura (5s) – alunos veem apenas a pergunta
  - Fase de respostas (tempo definido) – opções aparecem
- ✅ Pontuação baseada em velocidade (1000 × tempo_restante / tempo_limite)
- ✅ Ranking em tempo real (parcial e final)
- ✅ Finalizar quiz e exibir ranking final

### Para Alunos (Players)
- ✅ Entrar com código de sala (sem criar conta)
- ✅ Escolher avatar (8 opções: 🐱, 🐶, 🦊, 🐼, 🐨, 🐸, 🐙, 🦄)
- ✅ Escolher nickname
- ✅ Ver perguntas em tempo real com fases:
  - Leitura (5s) – apenas a pergunta
  - Respostas – opções com timer
- ✅ Pontuação calculada instantaneamente
- ✅ Ranking parcial entre perguntas e ranking final
- ✅ Player de música integrado (playlists separadas para menu e jogo)

### Player de Música
- 🎵 Detecta automaticamente a página (menu ou jogo) e troca a playlist
- 🎵 Playlist do menu: músicas com vocais (pasta `/assets/music/Index/`)
- 🎵 Playlist do jogo: músicas instrumentais (pasta `/assets/music/instrumental/`)
- 🎵 Controles: play/pause, próximo/anterior, volume, mute
- 🎵 Modo minimizável (círculo com a letra "K" e pulsação)
- 🎵 Atalhos de teclado (Espaço, setas ← → ↑ ↓)
- 🎵 Persistência de última música e volume (separado por tipo de playlist)

## 🚀 Tech Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Firebase Authentication, Firestore |
| **Hospedagem** | SquareCloud (ou qualquer servidor estático) |
| **Música** | Áudio nativo do navegador + playlist dinâmica |

## 📁 Estrutura de Pastas

kink-is-not-kahoot/
├── assets/
│ ├── music/
│ │ ├── Index/ # Músicas do menu (com vocais)
│ │ │ ├── KINK - Ta pronto pro jogo.mp3
│ │ │ ├── KINK - EletroVibe.mp3
│ │ │ └── ...
│ │ └── instrumental/ # Músicas do jogo (instrumentais)
│ │ ├── KINK - Play! 2.mp3
│ │ ├── KINK - Quiz Lobby Cipher 2.mp3
│ │ └── ...
│ └── avatars/ # (opcional)
├── css/
│ ├── style.css # Estilos globais e landing page
│ ├── components.css # Componentes reutilizáveis
│ └── player.css # Estilos do player de música
├── js/
│ ├── firebase-config.js # Configuração do Firebase
│ ├── auth.js # Autenticação (Google)
│ ├── utils.js # Utilitários (toast, formatação, avatares)
│ ├── quiz-manager.js # CRUD de quizzes
│ ├── create-quiz.js # Editor de perguntas
│ ├── host.js # Lógica do painel do professor
│ ├── player.js # Lógica do aluno
│ └── music-player.js # Player de música (playlists, minimizar)
├── index.html # Página inicial
├── host.html # Painel do professor
├── player.html # Tela do aluno
├── create-quiz.html # Criar/editar quizzes
├── my-quizzes.html # Lista de quizzes
├── README.md # Este arquivo
└── .gitignore
text


## 🛠️ Como Executar Localmente

### Pré-requisitos
- Node.js (opcional, apenas para usar Firebase CLI)
- Conta Google (para Firebase)
- Servidor web estático (ex: Live Server do VS Code, SquareCloud, etc.)

### Passos

1. **Clone o repositório**
   ```bash
   git clone https://github.com/Vinicius-Merces/Kink.git
   cd Kink

    Configure o Firebase

        Crie um projeto no Firebase Console

        Ative Authentication → método Google

        Ative Firestore Database (crie no modo de produção)

        Nas regras do Firestore, permita leitura/escrita para usuários autenticados (ou refine depois)

        Copie as credenciais do projeto para js/firebase-config.js

    Adicione as músicas

        Coloque seus arquivos de música nas pastas assets/music/Index/ e assets/music/instrumental/

        Atualize os caminhos e nomes no music-player.js (se necessário)

    Execute localmente

        Use o Live Server do VS Code ou qualquer servidor estático

        Acesse http://localhost:5500

    (Opcional) Deploy no SquareCloud ou Firebase Hosting

        Para SquareCloud: envie todos os arquivos via FTP ou use o painel

        Para Firebase Hosting: instale Firebase CLI e execute firebase deploy --only hosting

🎮 Como Jogar
Para Professores (Hosts)

    Faça login com sua conta Google

    Crie um quiz (título, perguntas, opções, tempo)

    Na lista de quizzes, clique no ícone 🎮 para iniciar uma sessão

    Compartilhe o código de 6 dígitos com os alunos

    Clique em Iniciar Quiz (tela de carregamento de 5s)

    Clique em Iniciar Pergunta para cada pergunta:

        Leitura (5s) – alunos veem apenas o texto

        Respostas (tempo limite) – opções aparecem

    Após cada pergunta, o ranking parcial é exibido

    Clique em Próxima Pergunta para continuar

    Ao final, veja o ranking final e feche a sessão

Para Alunos (Players)

    Acesse o link do jogo e digite o código de 6 dígitos

    Escolha um avatar e um nickname

    Aguarde o professor iniciar o quiz

    Durante a pergunta:

        Leia a pergunta (5s)

        Responda clicando em uma das opções (quanto mais rápido, mais pontos)

    Veja seu desempenho no ranking parcial

    Ao final, confira o ranking final

🎨 Design e Identidade Visual

    Cores principais: #ff6b6b (Rebel Red) e #4ecdc4 (KINK Teal)

    Fundo escuro: gradiente de #1a1a2e a #0f3460

    Efeito glitch no título principal

    Cards com vidro (glassmorphism) e hover com brilho

    Player de música flutuante com minimização e indicadores visuais

    Totalmente responsivo (mobile, tablet, desktop)

🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

    Faça um fork do projeto

    Crie uma branch para sua feature (git checkout -b feature/nova-feature)

    Commit suas mudanças (git commit -m 'Adiciona nova feature')

    Push para a branch (git push origin feature/nova-feature)

    Abra um Pull Request

📄 Licença

Distribuído sob a licença MIT. Veja LICENSE para mais informações.
📬 Contato

    Autor: Vinicius Mercês Silva

    GitHub: https://github.com/Vinicius-Merces

    LinkedIn: https://www.linkedin.com/in/vinicius-merces-dev/

🙏 Agradecimentos

    Firebase pela infraestrutura

    Comunidade open-source

    Todos os testadores que ajudaram a refinar o sistema

⚠️ Disclaimer: KINK is not Kahoot não é afiliado ao Kahoot. É um projeto independente criado para fins educacionais e de portfólio.

Built with 🔥 for those who dare to be different
