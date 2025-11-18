/**
 * PM2 Ecosystem Configuration
 * Production-ready process manager configuration
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'beyondmoksha-api',
    script: './src/server.js',
    
    // Instances
    instances: 2, // Run 2 instances for load balancing
    exec_mode: 'cluster', // Cluster mode for multiple instances
    
    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    
    // Auto-restart configuration
    watch: false, // Disable watch in production
    max_memory_restart: '500M', // Restart if memory exceeds 500MB
    min_uptime: '10s', // Min uptime before considering stable
    max_restarts: 10, // Max restarts within restart_delay
    restart_delay: 4000, // Delay between restarts (ms)
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true, // Merge logs from all instances
    
    // Advanced
    listen_timeout: 3000, // Time to wait for app to be ready (ms)
    kill_timeout: 5000, // Time to wait before force kill (ms)
    wait_ready: false, // Wait for process.send('ready')
    
    // Source map support (for debugging)
    source_map_support: true,
    
    // Auto restart on file change (development only)
    watch: process.env.NODE_ENV !== 'production',
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      'prisma/migrations',
    ],
    
    // Cron restart (optional)
    // cron_restart: '0 3 * * *', // Restart at 3 AM daily
  }],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/beyondmoksha-blogs.git',
      path: '/opt/beyondmoksha-blogs',
      'post-deploy': 'npm install && npm run prisma:generate && npm run prisma:deploy && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get update && apt-get install -y git nodejs npm postgresql-client',
    },
  },
};
