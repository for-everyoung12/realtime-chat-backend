import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'
import { logger } from './modules/common/obs/logger.js'
import { metricsMiddleware, metricsRouter } from './modules/common/obs/metrics.js'
import { checkRedisHealth } from './modules/common/cache/redis.js'
import { apiRouter } from './routes.js'
import mongoose from 'mongoose'
import { specs, swaggerUiOptions } from './modules/common/docs/swagger.js'
import swaggerUi from 'swagger-ui-express'

export const makeCorsAllowlist = () => {
  const raw = process.env.CORS_ORIGIN || ''
  const list = raw.split(',').map(s => s.trim()).filter(Boolean)
  const allowAll = list.includes('*')
  return { list, allowAll }
}

const app = express()

// Observability
app.use(pinoHttp({ logger }))
app.use(metricsMiddleware)

// Security + perf
app.use(helmet())

const { list: CORS_LIST, allowAll: ALLOW_ALL } = makeCorsAllowlist()
const corsOptions = {
  origin(origin, cb) {
    // Cho phép request không có Origin (curl/healthcheck)
    if (!origin) return cb(null, true)
    if (ALLOW_ALL || CORS_LIST.includes(origin)) return cb(null, true)
    return cb(new Error('CORS_NOT_ALLOWED'))
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}
app.use(cors(corsOptions))
app.options('*', cors({ ...corsOptions, origin: true }))

app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// ===== Health & Metrics =====
app.get('/health', async (_req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        redis: await checkRedisHealth() ? 'connected' : 'disconnected',
      },
    }
    const allHealthy = health.services.mongodb === 'connected' && health.services.redis === 'connected'
    res.status(allHealthy ? 200 : 503).json(health)
  } catch (error) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), error: error.message })
  }
})
app.use(process.env.METRICS_ROUTE || '/metrics', metricsRouter)

// ===== API Documentation =====
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions))

// ===== API v1 =====
app.use('/v1', apiRouter)

// ===== 404 handler =====
app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }))

// ===== Error handler =====
app.use((err, req, res, _next) => {
  logger.error({ err, path: req.path, method: req.method }, 'Request error')
  res.status(err.status || 500).json({ error: err.message || 'SERVER_ERROR' })
})

export default app
