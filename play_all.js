const { io } = require("socket.io-client");

const socket = io("http://127.0.0.1:3000");

socket.on("connect", () => {
  console.log("✅ Conectado ao Master!");
  console.log("⏳ Enviando comando LOAD (preparando vídeos na memória)...");
  socket.emit("cli_command", { command: "load" });
  
  // Espera 2 segundos para dar tempo de todos os slaves carregarem o vídeo na memória
  setTimeout(() => {
    console.log("▶️ Enviando comando PLAY (iniciando todos juntos)...");
    socket.emit("cli_command", { command: "play" });
    
    setTimeout(() => {
      console.log("🚀 Tudo rodando! Pode fechar esse script.");
      process.exit(0);
    }, 500);
  }, 2000); 
});

socket.on("connect_error", (err) => {
  console.error("❌ Erro ao conectar no Master. O Master está rodando no PM2?");
  process.exit(1);
});
