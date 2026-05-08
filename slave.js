require("dotenv").config();
const { io } = require("socket.io-client");
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const dgram = require("dgram");

// MODE: "split" (3 mpvs separados) | "wide" (1 mpv spanando 3 telas)
const MODE = process.env.MODE || "split";
let MASTER_IP = process.env.MASTER_IP || "auto";

// --- Modo SPLIT ---
const VIDEO_1_PATH = process.env.VIDEO_1_PATH || path.join(__dirname, "videos", "screen_1.mp4");
const VIDEO_2_PATH = process.env.VIDEO_2_PATH || path.join(__dirname, "videos", "screen_2.mp4");
const VIDEO_3_PATH = process.env.VIDEO_3_PATH || path.join(__dirname, "videos", "screen_3.mp4");

// --- Modo WIDE ---
const WIDE_VIDEO_PATH = process.env.WIDE_VIDEO_PATH || path.join(__dirname, "videos", "wide_left.mp4");
const WIDE_GEOMETRY   = process.env.WIDE_GEOMETRY   || "3662x1920+0+0";

// IPC sockets
const IPC_SOCKET_1    = "/tmp/mpv_screen1.sock";
const IPC_SOCKET_2    = "/tmp/mpv_screen2.sock";
const IPC_SOCKET_3    = "/tmp/mpv_screen3.sock";
const IPC_SOCKET_WIDE = "/tmp/mpv_wide.sock";

let socket = null;
let mpvProcess1 = null, mpvProcess2 = null, mpvProcess3 = null, mpvProcessWide = null;
let ipcConnection1 = null, ipcConnection2 = null, ipcConnection3 = null, ipcConnectionWide = null;

// Estado de playback
let localTimes     = [0, 0, 0]; // tempos locais no modo split
let localTimeWide  = 0;         // tempo local no modo wide
let startEpoch     = null;      // epoch em que o play foi disparado (vindo do master)
let videoDuration  = null;      // duração do vídeo (detectada via mpv)
let playScheduled  = null;      // referência do setTimeout de play atômico
let loopEndEmitted = false;     // evita emitir loop_end múltiplas vezes por ciclo

// ─── MPV ───────────────────────────────────────────────────────────────────

function startMpv(screenId, socketPath, videoPath) {
  const args = [
    "--fs",
    `--screen=${screenId}`,
    `--input-ipc-server=${socketPath}`,
    "--no-osc", "--no-osd-bar",
    "--keep-open=yes", "--idle=yes",
    "--loop=inf", "--pause",
    "--ontop", "--no-border",
    "--cursor-autohide=always",
    "--no-input-default-bindings",
    "--input-conf=/dev/null",
    videoPath
  ];
  console.log(`Starting mpv screen=${screenId}`);
  const proc = spawn("mpv", args, { stdio: "ignore" });
  proc.on("close", (code) => console.log(`mpv screen=${screenId} exited code=${code}`));
  return proc;
}

function startMpvWide(socketPath, videoPath, geometry) {
  const args = [
    `--geometry=${geometry}`,
    `--input-ipc-server=${socketPath}`,
    "--no-osc", "--no-osd-bar",
    "--keep-open=yes", "--idle=yes",
    "--loop=inf", "--pause",
    "--ontop", "--no-border",
    "--cursor-autohide=always",
    "--no-input-default-bindings",
    "--input-conf=/dev/null",
    "--no-keepaspect-window",
    videoPath
  ];
  console.log(`[WIDE] Starting mpv geometry=${geometry}`);
  const proc = spawn("mpv", args, { stdio: "ignore" });
  proc.on("close", (code) => console.log(`[WIDE] mpv exited code=${code}`));
  return proc;
}

// ─── IPC ───────────────────────────────────────────────────────────────────

function sendMpvCommand(conn, command) {
  if (conn && !conn.destroyed) {
    try {
      conn.write(JSON.stringify({ command }) + "\n");
    } catch (e) {
      console.error("IPC write error:", e.message);
    }
  }
}

function sendToAll(command) {
  if (MODE === "wide") {
    sendMpvCommand(ipcConnectionWide, command);
  } else {
    sendMpvCommand(ipcConnection1, command);
    sendMpvCommand(ipcConnection2, command);
    sendMpvCommand(ipcConnection3, command);
  }
}

// Detecta fim de loop: quando o tempo cai abruptamente (virada de loop)
function checkLoopEnd(prevTime, newTime) {
  if (prevTime > 1 && newTime < 0.5) {
    if (!loopEndEmitted && socket && socket.connected) {
      loopEndEmitted = true;
      console.log(`Loop end detected (${prevTime.toFixed(2)} → ${newTime.toFixed(2)})`);
      socket.emit("loop_end");
      // Permite emitir novamente depois que o novo ciclo começar
      setTimeout(() => { loopEndEmitted = false; }, 2000);
    }
  }
}

function handleMpvData(index, data) {
  try {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const response = JSON.parse(line);

      if (response.event === "property-change") {
        if (response.name === "playback-time" && response.data != null) {
          const prev = localTimes[index];
          localTimes[index] = response.data;
          if (index === 0) checkLoopEnd(prev, response.data);
        }
        if (response.name === "duration" && response.data && !videoDuration) {
          videoDuration = response.data;
          if (socket && socket.connected) {
            socket.emit("video_duration", { duration: videoDuration });
          }
        }
      }
    }
  } catch (e) { /* JSON parcial, ignora */ }
}

function handleMpvDataWide(data) {
  try {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const response = JSON.parse(line);

      if (response.event === "property-change") {
        if (response.name === "playback-time" && response.data != null) {
          const prev = localTimeWide;
          localTimeWide = response.data;
          checkLoopEnd(prev, response.data);
        }
        if (response.name === "duration" && response.data && !videoDuration) {
          videoDuration = response.data;
          if (socket && socket.connected) {
            socket.emit("video_duration", { duration: videoDuration });
          }
        }
      }
    }
  } catch (e) { /* JSON parcial, ignora */ }
}

function connectToIpc(socketPath, onData, callback, retries = 10) {
  const conn = net.createConnection(socketPath);
  conn.on("connect", () => {
    console.log(`IPC connected: ${socketPath}`);
    conn.write(JSON.stringify({ command: ["observe_property", 1, "playback-time"] }) + "\n");
    conn.write(JSON.stringify({ command: ["observe_property", 2, "duration"] }) + "\n");
    callback(conn);

    // Se o play já deveria ter começado, busca a posição correta e despausa
    if (startEpoch) {
      const expectedTime = ((Date.now() - startEpoch) / 1000) % (videoDuration || 9999);
      if (expectedTime > 0) {
        conn.write(JSON.stringify({ command: ["seek", expectedTime, "absolute"] }) + "\n");
        conn.write(JSON.stringify({ command: ["set_property", "pause", false] }) + "\n");
      }
    }
  });
  conn.on("data", onData);
  conn.on("error", (err) => {
    if (retries > 0) setTimeout(() => connectToIpc(socketPath, onData, callback, retries - 1), 500);
    else console.error(`IPC failed: ${socketPath}:`, err.message);
  });
}

// ─── PLAYERS ───────────────────────────────────────────────────────────────

function cleanSockets(...paths) {
  for (const p of paths) {
    try { require("fs").unlinkSync(p); } catch (e) { /* não existia, ok */ }
  }
}

function initPlayers() {
  if (MODE === "wide") {
    if (mpvProcessWide) mpvProcessWide.kill();
    cleanSockets(IPC_SOCKET_WIDE);
    mpvProcessWide = startMpvWide(IPC_SOCKET_WIDE, WIDE_VIDEO_PATH, WIDE_GEOMETRY);
    setTimeout(() => {
      connectToIpc(IPC_SOCKET_WIDE, handleMpvDataWide, (conn) => { ipcConnectionWide = conn; });
    }, 1500);
    return;
  }

  if (mpvProcess1) mpvProcess1.kill();
  if (mpvProcess2) mpvProcess2.kill();
  if (mpvProcess3) mpvProcess3.kill();
  cleanSockets(IPC_SOCKET_1, IPC_SOCKET_2, IPC_SOCKET_3);

  mpvProcess1 = startMpv(0, IPC_SOCKET_1, VIDEO_1_PATH);
  mpvProcess2 = startMpv(1, IPC_SOCKET_2, VIDEO_2_PATH);
  mpvProcess3 = startMpv(2, IPC_SOCKET_3, VIDEO_3_PATH);

  setTimeout(() => {
    connectToIpc(IPC_SOCKET_1, (d) => handleMpvData(0, d), (conn) => { ipcConnection1 = conn; });
    connectToIpc(IPC_SOCKET_2, (d) => handleMpvData(1, d), (conn) => { ipcConnection2 = conn; });
    connectToIpc(IPC_SOCKET_3, (d) => handleMpvData(2, d), (conn) => { ipcConnection3 = conn; });
  }, 1000);
}

// ─── PLAY ATÔMICO ──────────────────────────────────────────────────────────

// Recebe epoch do master e agenda o play para exatamente aquele momento
function schedulePlay(epoch) {
  startEpoch = epoch;
  const delay = epoch - Date.now();

  if (playScheduled) clearTimeout(playScheduled);

  // Seek para 0 imediatamente, depois aguarda o epoch para dar play
  sendToAll(["seek", 0, "absolute"]);

  if (delay <= 0) {
    // Já passou o momento — play imediato
    sendToAll(["set_property", "pause", false]);
    return;
  }

  console.log(`Scheduled play in ${delay}ms`);
  playScheduled = setTimeout(() => {
    sendToAll(["set_property", "ontop", true]);
    if (MODE !== "wide") {
      sendMpvCommand(ipcConnection1, ["set_property", "fullscreen", true]);
      sendMpvCommand(ipcConnection2, ["set_property", "fullscreen", true]);
      sendMpvCommand(ipcConnection3, ["set_property", "fullscreen", true]);
    }
    sendToAll(["set_property", "pause", false]);
    console.log("▶️  Play!");
  }, delay);
}

// Heartbeat: corrige drift calculando a posição esperada pelo relógio do sistema
function handleHeartbeat(data) {
  if (!startEpoch) return;

  const elapsed = (data.epoch - startEpoch) / 1000; // segundos desde o play
  if (!videoDuration || elapsed < 0) return;

  const expectedTime = elapsed % videoDuration;

  const localTime = MODE === "wide" ? localTimeWide : localTimes[0];
  const diff = Math.abs(localTime - expectedTime);

  // Só corrige se o drift for maior que 0.3s
  if (diff > 0.3) {
    console.log(`Drift ${diff.toFixed(3)}s — correcting to ${expectedTime.toFixed(2)}s`);
    sendToAll(["seek", expectedTime, "absolute"]);
  }
}

// ─── MASTER CONNECTION ─────────────────────────────────────────────────────

function connectToMasterServer(ip) {
  if (socket) socket.disconnect();

  console.log(`Connecting to Master at ${ip}...`);
  socket = io(ip);

  socket.on("connect", () => console.log("Connected to master!"));

  socket.on("load", () => {
    console.log("Command: LOAD");
    initPlayers();
  });

  // Play atômico — agenda o play para um epoch específico
  socket.on("play_at", (data) => {
    console.log(`Command: PLAY_AT epoch=${data.epoch}`);
    schedulePlay(data.epoch);
  });

  socket.on("pause", () => {
    console.log("Command: PAUSE");
    if (playScheduled) { clearTimeout(playScheduled); playScheduled = null; }
    sendToAll(["set_property", "pause", true]);
  });

  socket.on("seek", (timeInSeconds) => {
    console.log(`Command: SEEK to ${timeInSeconds}`);
    sendToAll(["seek", timeInSeconds, "absolute"]);
  });

  // Heartbeat periódico para correção de drift
  socket.on("heartbeat", (data) => handleHeartbeat(data));
}

// ─── AUTO-DESCOBERTA UDP ───────────────────────────────────────────────────

if (MASTER_IP === "auto") {
  console.log("Listening for Master UDP broadcasts on port 41234...");
  const udpClient = dgram.createSocket("udp4");
  udpClient.on("message", (msg, rinfo) => {
    if (msg.toString() === "PUC_MASTER_HERE") {
      const discoveredIp = `http://${rinfo.address}:3000`;
      if (!socket || socket.io.uri !== discoveredIp) {
        console.log(`Found Master at ${rinfo.address}`);
        connectToMasterServer(discoveredIp);
      }
    }
  });
  udpClient.bind(41234);
} else {
  connectToMasterServer(MASTER_IP);
}

// Aguarda o "load" do master para iniciar — evita dupla inicialização

// ─── LIMPEZA ───────────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  if (mpvProcessWide) mpvProcessWide.kill();
  if (mpvProcess1) mpvProcess1.kill();
  if (mpvProcess2) mpvProcess2.kill();
  if (mpvProcess3) mpvProcess3.kill();
  process.exit();
});
