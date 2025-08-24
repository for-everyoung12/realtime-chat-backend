import { Queue } from 'bullmq'
import { redis } from '../common/cache/redis.js'

export const notifyQueue = new Queue('notify:dispatch', {
  connection: redis.connector || redis, // ioredis instance
  prefix: process.env.BULL_PREFIX || 'chat-app'
})

// Ví dụ enqueue: await notifyQueue.add('webpush', { userId, payload })
