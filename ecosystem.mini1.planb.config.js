const path = require("path");

// Plano B: cada Mac Mini roda 1 único mpv cobrindo as 3 telas lado a lado (wide).
//
// Pré-requisito: as 3 telas do Mac Mini devem estar configuradas como displays
// contíguos em System Settings → Displays → Arrange, sem rotação.
//
// WIDE_GEOMETRY: "LARGURAxALTURA+OFFSET_X+OFFSET_Y"
//   - Largura = soma das larguras das 3 telas
//   - Altura  = altura das telas
//   - Offset  = posição X do display mais à esquerda no arranjo do macOS
//   Ajuste conforme a resolução real das suas telas.

module.exports = {
  apps: [
    {
      name: "master",
      script: "master.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "slave-mini1-wide",
      script: "slave.js",
      watch: false,
      env: {
        MODE: "wide",
        MASTER_IP: "http://127.0.0.1:3000",
        IS_TIME_MASTER: "true",
        WIDE_VIDEO_PATH: path.join(__dirname, "videos", "wide_left.mp4"),
        // Ajuste WIDE_GEOMETRY para a resolução real das 3 telas somadas
        // Exemplo: 3 telas 1080x1920 lado a lado → "3240x1920+0+0"
        WIDE_GEOMETRY: "3662x1920+0+0",
      }
    }
  ]
};
