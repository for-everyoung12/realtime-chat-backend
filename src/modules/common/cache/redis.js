import { Redis } from 'ioredis'
import { logger } from '../obs/logger.js'

const base = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined
}

export const redis = new Redis(base)
export const redisPub = new Redis(base)
export const redisSub = new Redis(base)

;[redis, redisPub, redisSub].forEach(c => {
  c.on('connect', () => logger.info('Redis connected'))
  c.on('error', (e) => logger.error(e, 'Redis error'))
})