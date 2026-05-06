const { Server } = require("socket.io");
const dgram = require("dgram");

const io = new Server(3000, {
  cors: { origin: "*" }
});

console.log("Master server running on port 3000");

// UDP Broadcast para autodescoberta na rede
const udpServer = dgram.createSocket("udp4");
udpServer.bind(() => {
  udpServer.setBroadcast(true);
  console.log("Broadcasting presence on UDP port 41234...");
  
  setInterval(() => {
    const message = Buffer.from("PUC_MASTER_HERE");
    udpServer.send(message, 0, message.length, 41234, "255.255.255.255");
  }, 2000); // Manda um "Oi" a cada 2 segundos para os slaves acharem
});

// Configuração de sincronismo
const VIDEO_DURATION = 33; // Duração do vídeo em segundos para o loop
let syncInterval = null;

function startSyncLoop() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    console.log("🔄 Periodic Sync: Forçando reinício do loop para manter todas as telas juntas.");
    io.emit("seek", 0);
    io.emit("play");
  }, VIDEO_DURATION * 1000);
}

function stopSyncLoop() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = null;
}

// Keep track of connected slaves
const slaves = new Set();
let autoPlayTimeout = null;

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id} from ${socket.handshake.address}`);
  slaves.add(socket.id);

  if (slaves.size === 2) {
    console.log("🌟 Os 2 Mac Minis (6 telas) foram detectados conectados ao Master!");
    console.log("⏳ Iniciando Auto-Play: Enviando LOAD para todas...");
    io.emit("load");
    
    if (autoPlayTimeout) clearTimeout(autoPlayTimeout);
    autoPlayTimeout = setTimeout(() => {
      console.log("▶️ Auto-Play: Enviando PLAY sincronizado para todas as 6 telas!");
      io.emit("play");
      startSyncLoop();
    }, 2500);
  }

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    slaves.delete(socket.id);
    if (slaves.size < 2) {
      stopSyncLoop();
    }
  });

  // CLI commands coming from the cli.js script
  socket.on("cli_command", (data) => {
    if (data.command === "play") {
      console.log("-> Broadcast: PLAY");
      io.emit("play");
      startSyncLoop();
    } else if (data.command === "pause") {
      console.log("-> Broadcast: PAUSE");
      io.emit("pause");
      stopSyncLoop();
    } else if (data.command === "seek" && data.arg !== undefined) {
      console.log(`-> Broadcast: SEEK ${data.arg}`);
      io.emit("seek", data.arg);
      if (data.arg == 0) startSyncLoop();
    } else if (data.command === "load") {
      console.log("-> Broadcast: LOAD");
      io.emit("load");
      stopSyncLoop();
    }
  });
});
