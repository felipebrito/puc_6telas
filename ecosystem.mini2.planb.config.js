const path = require("path");

// Plano B — Mac Mini 2 (metade direita do vídeo).
// Este Mini NÃO roda o master, apenas o slave.
// Conecta ao Master do Mini 1 via UDP autodiscovery.
//
// WIDE_GEOMETRY: ajuste conforme a resolução real das 3 telas somadas.

module.exports = {
  apps: [
    {
      name: "slave-mini2-wide",
      script: "slave.js",
      watch: false,
      env: {
        MODE: "wide",
        MASTER_IP: "auto",
        IS_TIME_MASTER: "false",
        WIDE_VIDEO_PATH: path.join(__dirname, "videos", "wide_right.mp4"),
        WIDE_GEOMETRY: "3662x1920+0+0",
      }
    }
  ]
};
