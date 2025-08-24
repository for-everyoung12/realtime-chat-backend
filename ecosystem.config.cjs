module.exports = {
  apps: [
    {
      name: 'realtime-chat-api',
      script: 'src/server.js',         
      node_args: ['--env-file=.env'],   
      exec_mode: 'cluster',
      instances: 'max',                  
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    }
  ]
}
