require("dotenv").config();
const { io } = require("socket.io-client");
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

// Configurações via variáveis de ambiente (ou defaults)
const MASTER_IP = process.env.MASTER_IP || "http://127.0.0.1:3000";
const VIDEO_1_PATH = process.env.VIDEO_1_PATH || path.join(__dirname, "video1.mp4");
const VIDEO_2_PATH = process.env.VIDEO_2_PATH || path.join(__dirname, "video2.mp4");
const VIDEO_3_PATH = process.env.VIDEO_3_PATH || path.join(__dirname, "video3.mp4");

// Sockets IPC do mpv
const IPC_SOCKET_1 = "/tmp/mpv_screen1.sock";
const IPC_SOCKET_2 = "/tmp/mpv_screen2.sock";
const IPC_SOCKET_3 = "/tmp/mpv_screen3.sock";

console.log(`Connecting to Master at ${MASTER_IP}...`);
const socket = io(MASTER_IP);

let mpvProcess1 = null;
let mpvProcess2 = null;
let mpvProcess3 = null;

let ipcConnection1 = null;
let ipcConnection2 = null;
let ipcConnection3 = null;

// Função para iniciar um processo do mpv
function startMpv(screenId, socketPath, videoPath) {
  // Argumentos essenciais: fullscreen, seleciona a tela correta, 
  // cria o servidor IPC, remove controles na tela, mantem aberto no final
  const args = [
    "--fs", 
    `--screen=${screenId}`,
    `--input-ipc-server=${socketPath}`,
    "--no-osc",
    "--no-osd-bar",
    "--keep-open=yes",
    "--idle=yes",
    videoPath
  ];

  console.log(`Starting mpv for screen ${screenId} with socket ${socketPath}`);
  
  const proc = spawn("mpv", args, { stdio: "ignore" });
  
  proc.on("close", (code) => {
    console.log(`mpv for screen ${screenId} exited with code ${code}`);
  });

  return proc;
}

// Envia comandos JSON via socket para o mpv
function sendMpvCommand(conn, command) {
  if (conn && !conn.destroyed) {
    try {
      const msg = JSON.stringify({ command: command }) + "\n";
      conn.write(msg);
    } catch (e) {
      console.error("Failed to send command to mpv:", e);
    }
  }
}

// Conectar ao socket do mpv (com retry caso o mpv ainda esteja abrindo)
function connectToIpc(socketPath, callback, retries = 5) {
  const conn = net.createConnection(socketPath);
  
  conn.on("connect", () => {
    console.log(`Successfully connected to mpv IPC at ${socketPath}`);
    callback(conn);
  });

  conn.on("error", (err) => {
    if (retries > 0) {
      setTimeout(() => connectToIpc(socketPath, callback, retries - 1), 500);
    } else {
      console.error(`Failed to connect to ${socketPath}:`, err.message);
    }
  });
}

// Inicializar players e conexões
function initPlayers() {
  if (mpvProcess1) mpvProcess1.kill();
  if (mpvProcess2) mpvProcess2.kill();
  if (mpvProcess3) mpvProcess3.kill();

  mpvProcess1 = startMpv(0, IPC_SOCKET_1, VIDEO_1_PATH);
  mpvProcess2 = startMpv(1, IPC_SOCKET_2, VIDEO_2_PATH);
  mpvProcess3 = startMpv(2, IPC_SOCKET_3, VIDEO_3_PATH);

  // Aguardar um pouco para garantir que os sockets foram criados
  setTimeout(() => {
    connectToIpc(IPC_SOCKET_1, (conn) => { ipcConnection1 = conn; });
    connectToIpc(IPC_SOCKET_2, (conn) => { ipcConnection2 = conn; });
    connectToIpc(IPC_SOCKET_3, (conn) => { ipcConnection3 = conn; });
  }, 1000);
}

socket.on("connect", () => {
  console.log("Connected to master!");
});

socket.on("play", () => {
  console.log("Command received: PLAY");
  sendMpvCommand(ipcConnection1, ["set_property", "pause", false]);
  sendMpvCommand(ipcConnection2, ["set_property", "pause", false]);
  sendMpvCommand(ipcConnection3, ["set_property", "pause", false]);
});

socket.on("pause", () => {
  console.log("Command received: PAUSE");
  sendMpvCommand(ipcConnection1, ["set_property", "pause", true]);
  sendMpvCommand(ipcConnection2, ["set_property", "pause", true]);
  sendMpvCommand(ipcConnection3, ["set_property", "pause", true]);
});

socket.on("seek", (timeInSeconds) => {
  console.log(`Command received: SEEK to ${timeInSeconds}`);
  sendMpvCommand(ipcConnection1, ["seek", timeInSeconds, "absolute"]);
  sendMpvCommand(ipcConnection2, ["seek", timeInSeconds, "absolute"]);
  sendMpvCommand(ipcConnection3, ["seek", timeInSeconds, "absolute"]);
});

socket.on("load", () => {
  console.log("Command received: LOAD");
  initPlayers();
});

// Inicialização local
initPlayers();

// Limpeza no encerramento
process.on("SIGINT", () => {
  if (mpvProcess1) mpvProcess1.kill();
  if (mpvProcess2) mpvProcess2.kill();
  if (mpvProcess3) mpvProcess3.kill();
  process.exit();
});
