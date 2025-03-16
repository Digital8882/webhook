module.exports = {
  apps: [{
    name: "trading-webhook",
    script: "trading-webhook-server.js",
    instances: 2,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
    },
    node_args: "--max-old-space-size=4096",
    exp_backoff_restart_delay: 100,
    watch: false,
    max_memory_restart: "1G",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    error_file: "logs/pm2-error.log",
    out_file: "logs/pm2-out.log"
  }]
}; 