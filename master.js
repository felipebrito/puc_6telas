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
  }, 2000);
});

// Estado global
const slaves = new Set();
let autoPlayTimeout = null;
let heartbeatInterval = null;
let startEpoch = null;       // epoch (ms) em que o play foi disparado
let videoDuration = null;    // duração do vídeo em segundos (reportada pelo slave)
let loopResetPending = false;

// Envia play_at para todos: cada slave calcula o delay exato localmente
function broadcastPlay(delayMs = 500) {
  startEpoch = Date.now() + delayMs;
  console.log(`▶️  play_at epoch=${startEpoch} (em ${delayMs}ms)`);
  io.emit("play_at", { epoch: startEpoch });
  startHeartbeat();
}

// Heartbeat periódico — slaves corrigem drift sem depender de report_time
function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (startEpoch) {
      io.emit("heartbeat", { epoch: Date.now(), startEpoch });
    }
  }, 2000);
}

function stopHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = null;
}

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id} from ${socket.handshake.address}`);
  slaves.add(socket.id);

  // Slave reporta a duração do vídeo na primeira conexão
  socket.on("video_duration", (data) => {
    if (!videoDuration) {
      videoDuration = data.duration;
      console.log(`Video duration set: ${videoDuration.toFixed(2)}s`);
    }
  });

  // Slave detectou fim de loop — coordena reset atômico de todos
  socket.on("loop_end", () => {
    if (loopResetPending) return;
    loopResetPending = true;
    console.log("🔄 Loop end detected — resetting all screens atomically");
    // Pausa todos, depois faz play_at sincronizado
    io.emit("pause");
    setTimeout(() => {
      loopResetPending = false;
      broadcastPlay(300);
    }, 200);
  });

  // Auto-play quando os 2 Mac Minis estiverem conectados
  if (slaves.size === 2) {
    console.log("🌟 Os 2 Mac Minis (6 telas) foram detectados!");
    io.emit("load");

    if (autoPlayTimeout) clearTimeout(autoPlayTimeout);
    autoPlayTimeout = setTimeout(() => {
      broadcastPlay(500);
    }, 5000); // 5s para os mpvs iniciarem
  }

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    slaves.delete(socket.id);
    if (slaves.size === 0) {
      stopHeartbeat();
      startEpoch = null;
    }
  });

  // Comandos manuais via CLI
  socket.on("cli_command", (data) => {
    if (data.command === "play") {
      broadcastPlay(200);
    } else if (data.command === "pause") {
      stopHeartbeat();
      startEpoch = null;
      io.emit("pause");
    } else if (data.command === "seek" && data.arg !== undefined) {
      io.emit("seek", data.arg);
    } else if (data.command === "load") {
      io.emit("load");
    }
  });
});
