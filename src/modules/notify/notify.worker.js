// src/modules/notify/notify.worker.js
import { Worker, Queue, QueueEvents } from 'bullmq'
import { redis } from '../common/cache/redis.js'
import { logger } from '../common/obs/logger.js'

// Tái sử dụng cấu hình kết nối từ ioredis
const connection = {
  host: redis.options.host,
  port: redis.options.port,
  password: redis.options.password,
  maxRetriesPerRequest: 1,
  enableAutoPipelining: true
}

export const notifyDLQ = new Queue('notify:dlq', { connection })
export const queueEvents = new QueueEvents('notify:dispatch', { connection })

export const worker = new Worker(
  'notify:dispatch',
  async (job) => {
    if (!job.data?.userId) throw new Error('INVALID_JOB')
    // TODO: xử lý gửi email / web-push
    logger.info({ jobId: job.id, data: job.data }, 'Processing notify job')
  },
  {
    connection,
    concurrency: Number(process.env.NOTIFY_CONCURRENCY || 8),
    lockDuration: 30000,
    removeOnComplete: 1000,
    removeOnFail: 500
  }
)

worker.on('failed', async (job, err) => {
  logger.error({ id: job.id, err: err.message }, 'notify job failed')
  if (job.attemptsMade >= 3) {
    await notifyDLQ.add('dead', job.toJSON())
  }
})

// Graceful stop
export async function stopWorker () {
  try {
    await worker.close()
    await queueEvents.close()
  } catch {}
}
