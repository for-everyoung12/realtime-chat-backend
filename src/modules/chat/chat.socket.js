import { wsEventsTotal } from '../common/obs/metrics.js'
import { createMessage } from './chat.service.js'

export function registerChatNamespace (nsp) {
  nsp.on('connection', (socket) => {
    // In real app, verify cookie/JWT here and attach userId
    const userId = socket.handshake.auth?.userId
    if (!userId) socket.disconnect(true)

    socket.on('join', ({ conversationId }) => {
      socket.join(conversationId)
      wsEventsTotal.labels('join').inc()
    })

    socket.on('leave', ({ conversationId }) => {
      socket.leave(conversationId)
      wsEventsTotal.labels('leave').inc()
    })

    socket.on('msg:send', async (payload, cb) => {
      try {
        const msg = await createMessage({ ...payload, senderId: userId })
        nsp.to(String(msg.conversationId)).emit('msg:new', msg)
        wsEventsTotal.labels('msg:send').inc()
        cb && cb({ ok: true, id: msg._id })
      } catch (e) {
        cb && cb({ ok: false, error: 'SEND_FAILED' })
      }
    })

    socket.on('typing:start', ({ conversationId }) => nsp.to(conversationId).emit('typing', { conversationId, userId, isTyping: true }))
    socket.on('typing:stop', ({ conversationId }) => nsp.to(conversationId).emit('typing', { conversationId, userId, isTyping: false }))
  })
}