import { listConversations, listMessages, createMessage } from './chat.service.js'
import { sendLimiter } from '../common/http/middlewares.js'
import { authRequired } from '../common/auth/auth.js'
import { Router } from 'express'

const router = Router()

router.get('/conversations', authRequired, async (req, res) => {
  const data = await listConversations(req.user.id, { cursor: req.query.cursor, limit: Number(req.query.limit || 20) })
  res.json(data)
})

router.get('/messages', authRequired, async (req, res) => {
  const data = await listMessages(req.query.conversationId, { cursor: req.query.cursor, limit: Number(req.query.limit || 50) })
  res.json(data)
})

router.post('/messages', authRequired, sendLimiter, async (req, res) => {
  const msg = await createMessage({ ...req.body, senderId: req.user.id })
  res.status(201).json(msg)
})

export default router