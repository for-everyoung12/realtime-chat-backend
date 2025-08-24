import rateLimit from 'express-rate-limit'
import { redis } from './cache/redis.js'

// Rate limiting with Redis store for distributed environments
export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'TOO_MANY_REQUESTS',
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options

  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    // Use Redis store for distributed rate limiting
    store: {
      incr: async (key) => {
        const count = await redis.incr(key)
        if (count === 1) {
          await redis.expire(key, Math.floor(windowMs / 1000))
        }
        return { totalHits: count, resetTime: new Date(Date.now() + windowMs) }
      },
      decrement: async (key) => {
        return await redis.decr(key)
      },
      resetKey: async (key) => {
        return await redis.del(key)
      }
    }
  })
}

// WebSocket rate limiting
export const wsRateLimiter = {
  async checkLimit(key, limit = 60, windowSec = 60) {
    const now = Math.floor(Date.now() / 1000)
    const k = `rl:ws:${key}:${Math.floor(now / windowSec)}`
    const v = await redis.incr(k)
    if (v === 1) await redis.expire(k, windowSec)
    return v <= limit
  }
}

// Input sanitization
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .substring(0, 4000) // Length limit
}

// Content validation
export function validateMessageContent(content, type) {
  if (type === 'text') {
    if (!content || typeof content !== 'string') {
      throw new Error('CONTENT_REQUIRED')
    }
    if (content.length > 4000) {
      throw new Error('CONTENT_TOO_LONG')
    }
    // Check for potentially harmful content
    const harmfulPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi
    ]
    
    for (const pattern of harmfulPatterns) {
      if (pattern.test(content)) {
        throw new Error('CONTENT_NOT_ALLOWED')
      }
    }
  }
  
  return sanitizeInput(content)
}

// File upload validation
export function validateFileUpload(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) {
  if (!file) {
    throw new Error('FILE_REQUIRED')
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('FILE_TYPE_NOT_ALLOWED')
  }
  
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('FILE_TOO_LARGE')
  }
  
  return true
}
