import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'
import { connectMongo } from './modules/common/db/mongo.js'
import { logger } from './modules/common/obs/logger.js'
import { metricsMiddleware, metricsRouter } from './modules/common/obs/metrics.js'
import { apiRouter } from './routes.js'

const app = express()

// Observability
app.use(pinoHttp({ logger }))
app.use(metricsMiddleware)

// Security + perf
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*', credentials: true }))
app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))

// DB
connectMongo()

// Health & metrics
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }))
app.use(process.env.METRICS_ROUTE || '/metrics', metricsRouter)

// API v1
app.use('/v1', apiRouter)

export default app