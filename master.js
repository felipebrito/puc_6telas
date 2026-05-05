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

// Keep track of connected slaves
const slaves = new Set();

io.on("connection", (socket) => {
  console.log(`Slave connected: ${socket.id} from ${socket.handshake.address}`);
  slaves.add(socket.id);

  socket.on("disconnect", () => {
    console.log(`Slave disconnected: ${socket.id}`);
    slaves.delete(socket.id);
  });
});

// Simple CLI to control the cluster
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("\n--- Controles ---");
console.log("play  : Tocar os vídeos");
console.log("pause : Pausar os vídeos");
console.log("seek [0-9]+ : Pular para um tempo específico (segundos)");
console.log("load  : Recarregar os vídeos em todos os players");
console.log("-----------------\n");

rl.on("line", (line) => {
  const [cmd, arg] = line.trim().split(" ");
  
  if (cmd === "play") {
    console.log("-> Broadcast: PLAY");
    io.emit("play");
  } else if (cmd === "pause") {
    console.log("-> Broadcast: PAUSE");
    io.emit("pause");
  } else if (cmd === "seek" && arg) {
    console.log(`-> Broadcast: SEEK ${arg}`);
    io.emit("seek", Number(arg));
  } else if (cmd === "load") {
    console.log("-> Broadcast: LOAD");
    io.emit("load");
  } else {
    console.log("Comando não reconhecido. Use: play, pause, seek <segundos>, load");
  }
});
