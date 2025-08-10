import rateLimit from 'express-rate-limit'

export const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false
})

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20
})