// pm2 ecosystem config（CommonJS，pm2 必须 .cjs/.js）
// 用法：pm2 start deploy/ecosystem.config.cjs
const { resolve } = require('path');

module.exports = {
  apps: [
    {
      name: 'uniclass-api',
      cwd: resolve(__dirname, '../server'),
      script: 'dist/main.js',
      instances: 1,                    // 单实例够用；并发上来后可改 'max' 走 cluster
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        // 其他环境变量统一从 server/.env 读（NestJS @nestjs/config 已加载）
        // 不要把敏感信息写在这里被 commit
      },
      out_file: resolve(__dirname, '../logs/api-out.log'),
      error_file: resolve(__dirname, '../logs/api-err.log'),
      merge_logs: true,
      time: true,                      // 给每行日志加时间戳
    },
  ],
};
