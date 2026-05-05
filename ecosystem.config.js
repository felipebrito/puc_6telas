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
      name: "slave",
      script: "slave.js",
      watch: false,
      env: {
        MASTER_IP: "auto",
        VIDEO_1_PATH: "/Users/brito/Desktop/PUC - Biomas 6telas/videos/screen_1.mp4",
        VIDEO_2_PATH: "/Users/brito/Desktop/PUC - Biomas 6telas/videos/screen_2.mp4",
        VIDEO_3_PATH: "/Users/brito/Desktop/PUC - Biomas 6telas/videos/screen_3.mp4",
      }
    }
  ]
};
