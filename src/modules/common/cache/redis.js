import { Redis } from 'ioredis'
import { logger } from '../obs/logger.js'

const baseConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Enable TLS if REDIS_TLS is set
  ...(process.env.REDIS_TLS === 'true' && {
    tls: {
      rejectUnauthorized: false
    }
  })
}

export const redis = new Redis(baseConfig)
export const redisPub = new Redis(baseConfig)
export const redisSub = new Redis(baseConfig)

const clients = [redis, redisPub, redisSub]

clients.forEach((client, index) => {
  const clientName = ['redis', 'redisPub', 'redisSub'][index]
  
  client.on('connect', () => {
    logger.info(`${clientName} connected successfully`)
  })
  
  client.on('ready', () => {
    logger.info(`${clientName} ready`)
  })
  
  client.on('error', (e) => {
    logger.error(e, `${clientName} error`)
  })
  
  client.on('close', () => {
    logger.warn(`${clientName} connection closed`)
  })
  
  client.on('reconnecting', () => {
    logger.info(`${clientName} reconnecting`)
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await Promise.all(clients.map(client => client.quit()))
    logger.info('Redis connections closed through app termination')
    process.exit(0)
  } catch (err) {
    logger.error(err, 'Error during Redis shutdown')
    process.exit(1)
  }
})

// Health check function
export async function checkRedisHealth() {
  try {
    await redis.ping()
    return true
  } catch (error) {
    logger.error(error, 'Redis health check failed')
    return false
  }
}