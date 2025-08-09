export default {
  apps: [
    {
      name: 'realtime-chat-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' }
    }
  ]
}