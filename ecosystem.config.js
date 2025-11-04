/**
 * PM2 进程管理配置文件
 * 使用方法: pm2 start ecosystem.config.js
 * 
 * PM2 是一个强大的 Node.js 进程管理器，提供：
 * - 自动重启应用
 * - 日志管理
 * - 集群模式支持
 * - 内存监控
 * - 开机自启
 */

module.exports = {
  apps: [
    {
      name: 'novel2video',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1, // 运行实例数量，1 表示单实例，'max' 表示使用所有 CPU 核心
      exec_mode: 'fork', // fork 模式（单实例），cluster 模式（多实例）
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 自动重启配置
      autorestart: true,
      max_restarts: 10, // 最大重启次数
      min_uptime: '10s', // 最小运行时间，少于此时长则认为是异常重启
      
      // 内存监控
      max_memory_restart: '1G', // 内存超过 1G 自动重启
      
      // 监听文件变化（生产环境建议关闭）
      watch: false,
      
      // 忽略监听的文件和目录
      ignore_watch: [
        'node_modules',
        '.next',
        'uploads',
        'logs',
        '.git',
      ],
      
      // 等待启动时间
      listen_timeout: 10000,
      
      // 杀掉进程前的等待时间
      kill_timeout: 5000,
    },
  ],
};

