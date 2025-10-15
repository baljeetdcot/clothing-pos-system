module.exports = {
  apps: [{
    name: 'pos-system',
    script: 'server-production.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_PATH: '/var/www/pos-system/pos_database.db',
      SESSION_SECRET: 'your-super-secret-session-key-change-this-in-production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
