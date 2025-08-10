import { wsEventsTotal } from '../common/obs/metrics.js'
import { createMessage, markMessageRead } from './chat.service.js'
import jwt from 'jsonwebtoken'

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

export function registerChatNamespace (nsp) {
  // Middleware auth cho namespace /chat
  nsp.use((socket, next) => {
    // Dev path: cho phép handshake auth.userId khi chưa login
    if (process.env.NODE_ENV !== 'production' && socket.handshake.auth?.userId) {
      socket.data.userId = socket.handshake.auth.userId
      return next()
    }
    const user = getUserFromCookie(socket)
    if (!user) return next(new Error('UNAUTHORIZED'))
    socket.data.userId = user.id
    next()
  })

  nsp.on('connection', (socket) => {
    const userId = socket.data.userId

    socket.on('join', ({ conversationId }) => {
      socket.join(String(conversationId))
      wsEventsTotal.labels('join').inc()
    })

    socket.on('leave', ({ conversationId }) => {
      socket.leave(String(conversationId))
      wsEventsTotal.labels('leave').inc()
    })

    socket.on('msg:send', async (payload, cb) => {
      try {
        const msg = await createMessage({ ...payload, senderId: userId })
        nsp.to(String(msg.conversationId)).emit('msg:new', msg)
        wsEventsTotal.labels('msg:send').inc()
        cb && cb({ ok: true, id: msg._id })
      } catch (e) { cb && cb({ ok: false, error: 'SEND_FAILED' }) }
    })

    socket.on('message:read', async ({ messageId }, cb) => {
      try {
        const { updated, conversationId } = await markMessageRead({ messageId, userId })
        nsp.to(String(conversationId)).emit('message:readBy', {
          messageId: String(updated._id),
          userId: String(userId),
          readBy: updated.readBy.map(x => String(x)),
          conversationId: String(conversationId)
        })
        wsEventsTotal.labels('message:read').inc()
        cb && cb({ ok: true })
      } catch (e) { cb && cb({ ok: false, error: e.message || 'READ_FAILED' }) }
    })
  })
}