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

// CLI commands coming from the cli.js script
io.on("connection", (socket) => {
  socket.on("cli_command", (data) => {
    if (data.command === "play") {
      console.log("-> Broadcast: PLAY");
      io.emit("play");
    } else if (data.command === "pause") {
      console.log("-> Broadcast: PAUSE");
      io.emit("pause");
    } else if (data.command === "seek" && data.arg !== undefined) {
      console.log(`-> Broadcast: SEEK ${data.arg}`);
      io.emit("seek", data.arg);
    } else if (data.command === "load") {
      console.log("-> Broadcast: LOAD");
      io.emit("load");
    }
  });
});
