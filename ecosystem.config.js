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
        MASTER_IP: "http://127.0.0.1:3000",
        VIDEO_1_PATH: "/Users/brito/Desktop/PUC - Biomas 6telas/video1.mp4",
        VIDEO_2_PATH: "/Users/brito/Desktop/PUC - Biomas 6telas/video2.mp4",
        VIDEO_3_PATH: "/Users/brito/Desktop/PUC - Biomas 6telas/video3.mp4",
      }
    }
  ]
};
