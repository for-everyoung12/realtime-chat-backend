import client from 'prom-client'
import express from 'express'

const register = new client.Registry()
client.collectDefaultMetrics({ register })

export const apiLatency = new client.Histogram({
  name: 'api_latency_ms',
  help: 'API latency in ms',
  labelNames: ['route', 'method', 'status'],
  buckets: [50, 100, 200, 300, 500, 1000, 2000]
})
register.registerMetric(apiLatency)

export const wsEventsTotal = new client.Counter({
  name: 'ws_events_total',
  help: 'Total WS events by type',
  labelNames: ['type']
})
register.registerMetric(wsEventsTotal)

export function metricsMiddleware (req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    apiLatency.labels(req.path, req.method, String(res.statusCode)).observe(Date.now() - start)
  })
  next()
}

export const metricsRouter = express.Router()
metricsRouter.get('/', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})