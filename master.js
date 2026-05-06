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
function startSyncLoop() {
  console.log("🔄 Sync Loop: Aguardando reports do Time Master...");
}

function stopSyncLoop() {
  console.log("⏹️ Sync Loop parado.");
}

// Keep track of connected slaves
const slaves = new Set();
let autoPlayTimeout = null;

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id} from ${socket.handshake.address}`);
  slaves.add(socket.id);

  // Recebe o tempo real da tela mestre e repassa para todos
  socket.on("report_time", (data) => {
    // Broadcast para todos os outros (Slaves e até o próprio Master local se necessário)
    io.emit("sync", { time: data.time });
  });

  if (slaves.size === 2) {
    console.log("🌟 Os 2 Mac Minis (6 telas) foram detectados!");
    io.emit("load");
    
    if (autoPlayTimeout) clearTimeout(autoPlayTimeout);
    autoPlayTimeout = setTimeout(() => {
      console.log("▶️ Iniciando reprodução sincronizada...");
      io.emit("play");
      startSyncLoop();
    }, 2500);
  }

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    slaves.delete(socket.id);
  });

  socket.on("cli_command", (data) => {
    if (data.command === "play") {
      io.emit("play");
    } else if (data.command === "pause") {
      io.emit("pause");
    } else if (data.command === "seek" && data.arg !== undefined) {
      io.emit("seek", data.arg);
    } else if (data.command === "load") {
      io.emit("load");
    }
  });
});
