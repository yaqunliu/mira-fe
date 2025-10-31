/**
 * PM2 进程管理配置文件
 * 使用方法: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'novel2video',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 2, // 或者使用 'max' 启动最大数量的实例
      exec_mode: 'cluster', // 集群模式
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 创建日志目录（如果不存在）
      // 注意：需要手动创建 logs 目录或修改路径
      
      // 自动重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // 内存监控
      max_memory_restart: '1G',
      
      // 监控间隔
      watch: false,
      
      // 忽略监听的文件
      ignore_watch: [
        'node_modules',
        '.next',
        'uploads',
        'logs',
      ],
    },
  ],
};

