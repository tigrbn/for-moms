module.exports = {
  apps: [
    {
      name: "formoms-api",
      cwd: "/root/formoms/api",
      script: "dist/src/main.js",
      instances: 1,
      exec_mode: "fork",
      env_file: "/root/formoms-secrets/api.env",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};

