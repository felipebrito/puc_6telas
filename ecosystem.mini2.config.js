const path = require("path");

module.exports = {
  apps: [
    {
      name: "slave-mini2",
      script: "slave.js",
      watch: false,
      env: {
        MASTER_IP: "http://192.168.0.1:3000",
        VIDEO_1_PATH: path.join(__dirname, "videos", "screen_4.mp4"),
        VIDEO_2_PATH: path.join(__dirname, "videos", "screen_5.mp4"),
        VIDEO_3_PATH: path.join(__dirname, "videos", "screen_6.mp4"),
      }
    }
  ]
};
