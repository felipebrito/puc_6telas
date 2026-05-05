const { io } = require("socket.io-client");
const readline = require("readline");

// Conecta ao Master Server rodando localmente (pelo PM2)
const socket = io("http://localhost:3000");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

socket.on("connect", () => {
  console.log("\n--- Controle Conectado ao Master ---");
  console.log("play  : Tocar os vídeos");
  console.log("pause : Pausar os vídeos");
  console.log("seek [0-9]+ : Pular para um tempo específico (segundos)");
  console.log("load  : Recarregar os vídeos em todos os players");
  console.log("------------------------------------\n");
  rl.prompt();
});

rl.prompt();

rl.on("line", (line) => {
  const [cmd, arg] = line.trim().split(" ");
  
  if (cmd === "play") {
    console.log("-> Enviando: PLAY");
    socket.emit("cli_command", { command: "play" });
  } else if (cmd === "pause") {
    console.log("-> Enviando: PAUSE");
    socket.emit("cli_command", { command: "pause" });
  } else if (cmd === "seek" && arg) {
    console.log(`-> Enviando: SEEK ${arg}`);
    socket.emit("cli_command", { command: "seek", arg: Number(arg) });
  } else if (cmd === "load") {
    console.log("-> Enviando: LOAD");
    socket.emit("cli_command", { command: "load" });
  } else {
    console.log("Comando não reconhecido. Use: play, pause, seek <segundos>, load");
  }
  rl.prompt();
});
