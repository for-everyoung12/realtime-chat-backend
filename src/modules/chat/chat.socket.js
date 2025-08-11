import jwt from 'jsonwebtoken'
import { wsEventsTotal, wsConnectedGauge, wsBroadcastTotal } from '../common/obs/metrics.js'
import { createMessage, markMessageRead, ensureMember } from './chat.service.js'
import { redis } from '../common/cache/redis.js'

const TYPING_TTL_MS = 2500;

// ---- helper
function getUserFromCookie(socket) {
  try {
    const raw = socket.request.headers.cookie || ''
    const cookieName = (process.env.COOKIE_NAME || 'chat_token') + '='
    const part = raw.split('; ').find(v => v.startsWith(cookieName))
    if (!part) return null
    const token = part.slice(cookieName.length)
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch { return null }
}

// Token bucket đơn giản (mặc định 60 req/phút/loại)
async function wsRateLimit (key, limit = 60, windowSec = 60) {
  const now = Math.floor(Date.now() / 1000)
  const k = `rl:${key}:${Math.floor(now / windowSec)}`
  const v = await redis.incr(k)
  if (v === 1) await redis.expire(k, windowSec)
  return v <= limit
}

export function registerChatNamespace (nsp) {
  // Auth
  nsp.use((socket, next) => {
    if (process.env.NODE_ENV !== 'production' && socket.handshake.auth?.userId) {
      socket.data.userId = socket.handshake.auth.userId; return next()
    }
    const user = getUserFromCookie(socket)
    if (!user) return next(new Error('UNAUTHORIZED'))
    socket.data.userId = user.id; next()
  })

  nsp.on('connection', (socket) => {
    const userId = String(socket.data.userId)
    wsConnectedGauge.inc()

    socket.on('disconnect', () => wsConnectedGauge.dec())

    socket.on('join', async ({ conversationId }, cb) => {
      try {
        await ensureMember(conversationId, userId)
        socket.join(String(conversationId))
        wsEventsTotal.labels('join').inc()
        cb && cb({ ok: true })
      } catch (e) { cb && cb({ ok: false, error: e.message }) }
    })

    socket.on('leave', ({ conversationId }) => {
      socket.leave(String(conversationId))
      wsEventsTotal.labels('leave').inc()
    })

    socket.on('msg:send', async (payload, cb) => {
      try {
        const allowed = await wsRateLimit(`send:${userId}`, 120, 60) // 120 msg/phút
        if (!allowed) return cb && cb({ ok: false, error: 'RATE_LIMITED' })

        await ensureMember(payload.conversationId, userId)
        const msg = await createMessage({ ...payload, senderId: userId })
        nsp.to(String(msg.conversationId)).emit('msg:new', msg)
        wsBroadcastTotal.labels('msg:new').inc()
        wsEventsTotal.labels('msg:send').inc()
        cb && cb({ ok: true, id: String(msg._id) })
      } catch (e) { cb && cb({ ok: false, error: e.message || 'SEND_FAILED' }) }
    })

    socket.on('message:read', async ({ messageId }, cb) => {
      try {
        const allowed = await wsRateLimit(`read:${userId}`, 300, 60)
        if (!allowed) return cb && cb({ ok: false, error: 'RATE_LIMITED' })

        const { updated, conversationId } = await markMessageRead({ messageId, userId })
        nsp.to(String(conversationId)).emit('message:readBy', {
          messageId: String(updated._id),
          userId,
          readBy: updated.readBy.map(x => String(x)),
          conversationId: String(conversationId)
        })
        wsBroadcastTotal.labels('message:readBy').inc()
        wsEventsTotal.labels('message:read').inc()
        cb && cb({ ok: true })
      } catch (e) { cb && cb({ ok: false, error: e.message || 'READ_FAILED' }) }
    })

    socket.on('typing:start', async ({ conversationId }) => {
      if (!(await isMember(conversationId, userId))) return
      nsp.to(String(conversationId)).emit('typing', { conversationId, userId, isTyping: true })
      wsBroadcastTotal.labels('typing').inc()
    })
    socket.on('typing:stop', async ({ conversationId }) => {
      if (!(await isMember(conversationId, userId))) return
      nsp.to(String(conversationId)).emit('typing', { conversationId, userId, isTyping: false })
      wsBroadcastTotal.labels('typing').inc()
    })
  })
}
