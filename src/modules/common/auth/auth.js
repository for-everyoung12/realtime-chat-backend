import jwt from 'jsonwebtoken'

const COOKIE = process.env.COOKIE_NAME || 'chat_token'

export function signToken (payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' })
}

export function setAuthCookie (res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: 7 * 24 * 3600 * 1000
  })
}

export function authRequired (req, res, next) {
  try {
    const token = req.cookies[COOKIE]
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (e) {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }
}