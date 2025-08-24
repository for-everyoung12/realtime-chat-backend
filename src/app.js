import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'
import { connectMongo } from './modules/common/db/mongo.js'
import { logger } from './modules/common/obs/logger.js'
import { metricsMiddleware, metricsRouter } from './modules/common/obs/metrics.js'
import { checkRedisHealth } from './modules/common/cache/redis.js'
import { apiRouter } from './routes.js'
import mongoose from 'mongoose'

const app = express()

// Observability
app.use(pinoHttp({ logger }))
app.use(metricsMiddleware)

// Security + perf
app.use(helmet())
const rawOrigins = process.env.CORS_ORIGIN || ''
const CORS_LIST = rawOrigins.split(',').map(s => s.trim()).filter(Boolean)
const ALLOW_ALL = CORS_LIST.includes('*')

const corsOptions = {
  origin(origin, cb) {
    // Cho phép server-to-server, curl, Postman (không có Origin header)
    if (!origin) return cb(null, true)

    if (ALLOW_ALL || CORS_LIST.includes(origin)) {
      // echo origin thay vì '*' để credentials hoạt động đúng chuẩn
      return cb(null, true)
    }
    return cb(new Error('CORS_NOT_ALLOWED'), false)
  },
  credentials: true,
  methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // preflight cache 1 ngày
}
app.use(cors(corsOptions))
// Preflight cho mọi route
app.options('*', cors({ ...corsOptions, origin: true }))

app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// ===== Database =====
connectMongo()

// ===== Health & Metrics =====
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        redis: await checkRedisHealth() ? 'connected' : 'disconnected'
      }
    }
    
    const allHealthy = health.services.mongodb === 'connected' && health.services.redis === 'connected'
    res.status(allHealthy ? 200 : 503).json(health)
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})
app.use(process.env.METRICS_ROUTE || '/metrics', metricsRouter)

// ===== API v1 =====
app.use('/v1', apiRouter)

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' })
})

// ===== Error handler =====
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method }, 'Request error')
  res.status(err.status || 500).json({ error: err.message || 'SERVER_ERROR' })
})

export default app