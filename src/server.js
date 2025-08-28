import http from 'http'
import { Server } from 'socket.io'
import app, { makeCorsAllowlist } from './app.js'
import { connectMongo } from './modules/common/db/mongo.js'
import { createAdapter } from '@socket.io/redis-adapter'
import { redisPub, redisSub } from './modules/common/cache/redis.js'
import { registerChatNamespace } from './modules/chat/chat.socket.js'
import { logger } from './modules/common/obs/logger.js'

connectMongo()

const port = Number(process.env.PORT || 8081)
const server = http.createServer(app)

const { list: CORS_LIST, allowAll: ALLOW_ALL } = makeCorsAllowlist()

const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: ALLOW_ALL
      ? (origin, cb) => cb(null, true)
      : CORS_LIST,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  pingInterval: 20000,
  pingTimeout: 25000,
  connectionStateRecovery: { maxDisconnectionDuration: 120000 },
})

io.adapter(createAdapter(redisPub, redisSub))

registerChatNamespace(io.of('/chat'))

io.engine.on('connection_error', (err) => {
  console.log('engineio error:', err.code, err.message, err.context)
})

server.listen(port, () => {
  logger.info({ port }, 'HTTP + WS listening')
})
