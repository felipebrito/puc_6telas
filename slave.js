require("dotenv").config();
const { io } = require("socket.io-client");
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const dgram = require("dgram");

// Configurações via variáveis de ambiente (ou defaults)
let MASTER_IP = process.env.MASTER_IP || "auto";

// MODE: "split" (3 mpvs separados, comportamento original)
//       "wide"  (1 mpv spanando as 3 telas, Plano B)
const MODE = process.env.MODE || "split";

// --- Modo SPLIT (original) ---
const VIDEO_1_PATH = process.env.VIDEO_1_PATH || path.join(__dirname, "videos", "screen_1.mp4");
const VIDEO_2_PATH = process.env.VIDEO_2_PATH || path.join(__dirname, "videos", "screen_2.mp4");
const VIDEO_3_PATH = process.env.VIDEO_3_PATH || path.join(__dirname, "videos", "screen_3.mp4");

// --- Modo WIDE (Plano B) ---
// Vídeo único que cobre as 3 telas lado a lado
const WIDE_VIDEO_PATH = process.env.WIDE_VIDEO_PATH || path.join(__dirname, "videos", "wide_left.mp4");
// Geometria do mpv: largura total das 3 telas x altura, posição X inicial no display
// Exemplo: 3663x1920+0+0  (ajuste conforme resolução real das telas)
const WIDE_GEOMETRY = process.env.WIDE_GEOMETRY || "3662x1920+0+0";

// Sockets IPC do mpv
const IPC_SOCKET_1 = "/tmp/mpv_screen1.sock";
const IPC_SOCKET_2 = "/tmp/mpv_screen2.sock";
const IPC_SOCKET_3 = "/tmp/mpv_screen3.sock";
const IPC_SOCKET_WIDE = "/tmp/mpv_wide.sock";

let socket = null;
let mpvProcess1 = null;
let mpvProcess2 = null;
let mpvProcess3 = null;
let mpvProcessWide = null;

let ipcConnection1 = null;
let ipcConnection2 = null;
let ipcConnection3 = null;
let ipcConnectionWide = null;

// Função para iniciar um processo do mpv em modo split (tela individual em fullscreen)
function startMpv(screenId, socketPath, videoPath) {
  const args = [
    "--fs",
    `--screen=${screenId}`,
    `--input-ipc-server=${socketPath}`,
    "--no-osc",
    "--no-osd-bar",
    "--keep-open=yes",
    "--idle=yes",
    "--loop=inf",
    "--pause",
    "--ontop",
    "--no-border",
    "--cursor-autohide=always",
    videoPath
  ];

  console.log(`Starting mpv for screen ${screenId} with socket ${socketPath}`);

  const proc = spawn("mpv", args, { stdio: "ignore" });

  proc.on("close", (code) => {
    console.log(`mpv for screen ${screenId} exited with code ${code}`);
  });

  return proc;
}

// Função para iniciar mpv em modo wide (janela sem borda cobrindo 3 telas via geometry)
function startMpvWide(socketPath, videoPath, geometry) {
  const args = [
    `--geometry=${geometry}`,
    `--input-ipc-server=${socketPath}`,
    "--no-osc",
    "--no-osd-bar",
    "--keep-open=yes",
    "--idle=yes",
    "--loop=inf",
    "--pause",
    "--ontop",
    "--no-border",
    "--cursor-autohide=always",
    "--no-keepaspect-window",
    videoPath
  ];

  console.log(`[WIDE] Starting wide mpv with geometry ${geometry}`);

  const proc = spawn("mpv", args, { stdio: "ignore" });

  proc.on("close", (code) => {
    console.log(`[WIDE] mpv exited with code ${code}`);
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

// Variáveis para rastrear o tempo atual de cada player localmente
let localTimes = [0, 0, 0];
let localTimeWide = 0;

function handleMpvData(index, data) {
  try {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const response = JSON.parse(line);
      if (response.event === "property-change" && response.name === "playback-time") {
        localTimes[index] = response.data;

        // Se este slave for o Time Master, reporta o tempo da Tela 1 (index 0) para o Master
        if (process.env.IS_TIME_MASTER === "true" && index === 0 && socket && socket.connected) {
          socket.emit("report_time", { time: response.data });
        }
      }
    }
  } catch (e) {
    // Silenciosamente ignora erros de parse de JSON parcial
  }
}

function handleMpvDataWide(data) {
  try {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const response = JSON.parse(line);
      if (response.event === "property-change" && response.name === "playback-time") {
        localTimeWide = response.data;

        if (process.env.IS_TIME_MASTER === "true" && socket && socket.connected) {
          socket.emit("report_time", { time: response.data });
        }
      }
    }
  } catch (e) {
    // Silenciosamente ignora erros de parse de JSON parcial
  }
}

// Conectar ao socket do mpv
function connectToIpc(socketPath, callback, retries = 5) {
  const conn = net.createConnection(socketPath);

  conn.on("connect", () => {
    console.log(`Successfully connected to mpv IPC at ${socketPath}`);
    // Pedir para o mpv nos avisar sempre que o tempo do vídeo mudar
    const msg = JSON.stringify({ command: ["observe_property", 1, "playback-time"] }) + "\n";
    conn.write(msg);
    callback(conn);
  });

  conn.on("data", (data) => {
    const index = socketPath.includes('screen1') ? 0 : socketPath.includes('screen2') ? 1 : 2;
    handleMpvData(index, data);
  });

  conn.on("error", (err) => {
    if (retries > 0) {
      setTimeout(() => connectToIpc(socketPath, callback, retries - 1), 500);
    } else {
      console.error(`Failed to connect to ${socketPath}:`, err.message);
    }
  });
}

function connectToIpcWide(socketPath, callback, retries = 10) {
  const conn = net.createConnection(socketPath);

  conn.on("connect", () => {
    console.log(`[WIDE] Connected to mpv IPC at ${socketPath}`);
    const msg = JSON.stringify({ command: ["observe_property", 1, "playback-time"] }) + "\n";
    conn.write(msg);
    callback(conn);
  });

  conn.on("data", (data) => handleMpvDataWide(data));

  conn.on("error", (err) => {
    if (retries > 0) {
      setTimeout(() => connectToIpcWide(socketPath, callback, retries - 1), 500);
    } else {
      console.error(`[WIDE] Failed to connect to ${socketPath}:`, err.message);
    }
  });
}

// Inicializar players e conexões
function initPlayers() {
  if (MODE === "wide") {
    if (mpvProcessWide) mpvProcessWide.kill();
    mpvProcessWide = startMpvWide(IPC_SOCKET_WIDE, WIDE_VIDEO_PATH, WIDE_GEOMETRY);
    setTimeout(() => {
      connectToIpcWide(IPC_SOCKET_WIDE, (conn) => { ipcConnectionWide = conn; });
    }, 1500);
    return;
  }

  // Modo split (original)
  if (mpvProcess1) mpvProcess1.kill();
  if (mpvProcess2) mpvProcess2.kill();
  if (mpvProcess3) mpvProcess3.kill();

  mpvProcess1 = startMpv(0, IPC_SOCKET_1, VIDEO_1_PATH);
  mpvProcess2 = startMpv(1, IPC_SOCKET_2, VIDEO_2_PATH);
  mpvProcess3 = startMpv(2, IPC_SOCKET_3, VIDEO_3_PATH);

  setTimeout(() => {
    connectToIpc(IPC_SOCKET_1, (conn) => { ipcConnection1 = conn; });
    connectToIpc(IPC_SOCKET_2, (conn) => { ipcConnection2 = conn; });
    connectToIpc(IPC_SOCKET_3, (conn) => { ipcConnection3 = conn; });
  }, 1000);
}

// Configurar a conexão com o Master
function connectToMasterServer(ip) {
  if (socket) {
    socket.disconnect();
  }

  console.log(`Connecting to Master at ${ip}...`);
  socket = io(ip);

  socket.on("connect", () => {
    console.log("Connected to master!");
  });

  socket.on("play", () => {
    console.log("Command received: PLAY");
    if (MODE === "wide") {
      sendMpvCommand(ipcConnectionWide, ["set_property", "ontop", true]);
      sendMpvCommand(ipcConnectionWide, ["set_property", "pause", false]);
      return;
    }
    // Garante que está em fullscreen e no topo
    sendMpvCommand(ipcConnection1, ["set_property", "fullscreen", true]);
    sendMpvCommand(ipcConnection1, ["set_property", "ontop", true]);
    sendMpvCommand(ipcConnection1, ["set_property", "pause", false]);

    sendMpvCommand(ipcConnection2, ["set_property", "fullscreen", true]);
    sendMpvCommand(ipcConnection2, ["set_property", "ontop", true]);
    sendMpvCommand(ipcConnection2, ["set_property", "pause", false]);

    sendMpvCommand(ipcConnection3, ["set_property", "fullscreen", true]);
    sendMpvCommand(ipcConnection3, ["set_property", "ontop", true]);
    sendMpvCommand(ipcConnection3, ["set_property", "pause", false]);
  });

  socket.on("pause", () => {
    console.log("Command received: PAUSE");
    if (MODE === "wide") {
      sendMpvCommand(ipcConnectionWide, ["set_property", "pause", true]);
      return;
    }
    sendMpvCommand(ipcConnection1, ["set_property", "pause", true]);
    sendMpvCommand(ipcConnection2, ["set_property", "pause", true]);
    sendMpvCommand(ipcConnection3, ["set_property", "pause", true]);
  });

  socket.on("seek", (timeInSeconds) => {
    console.log(`Command received: SEEK to ${timeInSeconds}`);
    if (MODE === "wide") {
      sendMpvCommand(ipcConnectionWide, ["seek", timeInSeconds, "absolute"]);
      return;
    }
    sendMpvCommand(ipcConnection1, ["seek", timeInSeconds, "absolute"]);
    sendMpvCommand(ipcConnection2, ["seek", timeInSeconds, "absolute"]);
    sendMpvCommand(ipcConnection3, ["seek", timeInSeconds, "absolute"]);
  });

  socket.on("sync", (data) => {
    const masterTime = data.time;

    if (MODE === "wide") {
      // Se é o Time Master, não se auto-corrige (é a referência)
      if (process.env.IS_TIME_MASTER === "true") return;
      const diff = Math.abs(localTimeWide - masterTime);
      if (masterTime < localTimeWide || diff > 0.3) {
        if (diff > 10) {
          console.log(`[WIDE] Loop Turn detected! Forcing reset to ${masterTime.toFixed(2)}`);
        }
        sendMpvCommand(ipcConnectionWide, ["seek", masterTime, "absolute"]);
      }
      return;
    }

    // Para cada uma das 3 telas locais, verifica se está em sincronia
    [ipcConnection1, ipcConnection2, ipcConnection3].forEach((conn, i) => {
      if (!conn) return;

      // Se esta tela for a Tela 1 do Time Master, NÃO se auto-corrige (ela é a referência)
      if (process.env.IS_TIME_MASTER === "true" && i === 0) return;

      const diff = Math.abs(localTimes[i] - masterTime);

      // Regra de Ouro: Se o Master resetou (tempo menor que o local) ou a diferença é grande, força o ajuste
      if (masterTime < localTimes[i] || diff > 0.3) {
        if (diff > 10) {
          console.log(`[Screen ${i}] Loop Turn detected! Master reset to ${masterTime.toFixed(2)}. Forcing local reset.`);
        }
        sendMpvCommand(conn, ["seek", masterTime, "absolute"]);
      }
    });
  });

  socket.on("load", () => {
    console.log("Command received: LOAD");
    initPlayers();
  });
}

// Auto-descoberta via UDP
if (MASTER_IP === "auto") {
  console.log("MASTER_IP set to 'auto'. Listening for Master UDP broadcasts on port 41234...");
  
  const udpClient = dgram.createSocket("udp4");
  
  udpClient.on("listening", () => {
    const address = udpClient.address();
    console.log(`UDP Client listening for broadcasts on port ${address.port}`);
  });

  udpClient.on("message", (msg, rinfo) => {
    if (msg.toString() === "PUC_MASTER_HERE") {
      const discoveredIp = `http://${rinfo.address}:3000`;
      
      // Se ainda não estivermos conectados, ou se for a primeira vez
      if (!socket || socket.io.uri !== discoveredIp) {
        console.log(`Found Master broadcasting from ${rinfo.address}!`);
        connectToMasterServer(discoveredIp);
      }
    }
  });

  udpClient.bind(41234);
} else {
  // IP estático já fornecido
  connectToMasterServer(MASTER_IP);
}

// No modo wide não inicializa localmente — aguarda o comando "load" do master
if (MODE !== "wide") {
  initPlayers();
}

// Limpeza no encerramento
process.on("SIGINT", () => {
  if (mpvProcessWide) mpvProcessWide.kill();
  if (mpvProcess1) mpvProcess1.kill();
  if (mpvProcess2) mpvProcess2.kill();
  if (mpvProcess3) mpvProcess3.kill();
  process.exit();
});
