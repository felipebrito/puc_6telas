const path = require("path");

module.exports = {
  apps: [
    {
      name: "master",
      script: "master_v1.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "slave-mini1",
      script: "slave_v1.js",
      watch: false,
      env: {
        MASTER_IP: "http://127.0.0.1:3000",
        IS_TIME_MASTER: "true",
        VIDEO_1_PATH: path.join(__dirname, "videos", "screen_1.mp4"),
        VIDEO_2_PATH: path.join(__dirname, "videos", "screen_2.mp4"),
        VIDEO_3_PATH: path.join(__dirname, "videos", "screen_3.mp4"),
      }
    }
  ]
};
