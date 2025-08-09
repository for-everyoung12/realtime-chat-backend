import http from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import { createAdapter } from '@socket.io/redis-adapter'
import { redisPub, redisSub } from './modules/common/cache/redis.js'
import { registerChatNamespace } from './modules/chat/chat.socket.js'
import { logger } from './modules/common/obs/logger.js'

const port = process.env.PORT || 8080
const server = http.createServer(app)

// Socket.IO core
const io = new Server(server, {
  path: '/socket.io',
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*', credentials: true }
})

// Redis adapter for horizontal scaling
io.adapter(createAdapter(redisPub, redisSub))

// Namespaces
registerChatNamespace(io.of('/chat'))

server.listen(port, () => {
  logger.info({ port }, 'HTTP server listening')
})