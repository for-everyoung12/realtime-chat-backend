import mongoose from 'mongoose'
import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'
import { sendLimiter } from '../common/http/middlewares.js'
import {
  createConversation, listConversations,
  listMessages, createMessage, markMessageRead
} from './chat.service.js'
import { ensureMember } from './chat.service.js'
const router = Router()
const isOID = mongoose.isValidObjectId

// GET /v1/chat/conversations?cursor&limit
router.get('/conversations', authRequired, async (req, res) => {
  let { cursor, limit } = req.query
  if (cursor && isNaN(Date.parse(cursor))) return res.status(400).json({ error: 'INVALID_CURSOR' })
  const data = await listConversations(req.user.id, { cursor, limit: Number(limit || 20) })
  res.json(data)
})

// POST /v1/chat/conversations { type, name?, memberIds[] }
router.post('/conversations', authRequired, async (req, res) => {
  const { type, name, memberIds } = req.body
  if (!Array.isArray(memberIds) || memberIds.some(id => !isOID(id))) {
    return res.status(400).json({ error: 'INVALID_MEMBER_ID' })
  }
  const conv = await createConversation({ type, name, memberIds })
  res.status(201).json(conv)
})

// GET /v1/chat/messages?conversationId&cursor&limit
router.get('/messages', authRequired, async (req, res) => {
  const { conversationId, cursor, limit } = req.query
  const data = await listMessages(conversationId, { cursor, limit: Number(limit || 50) })
  res.json(data)
})

// POST /v1/chat/messages { conversationId,type,content|fileUrl }
router.post('/messages', authRequired, sendLimiter, async (req, res) => {
  const {conversationId, type, content, fileUrl, metadata, clientMsgId} = req.body || {}
  await ensureMember(conversationId, req.user.id)
  const msg = await createMessage({ conversationId, type, content, fileUrl, metadata, clientMsgId, senderId: req.user.id })
  res.status(201).json(msg)
})

// PATCH /v1/chat/messages/:id/read
router.patch('/messages/:id/read', authRequired, async (req, res) => {
  const { id } = req.params
  const { updated, conversationId } = await markMessageRead({ messageId: id, userId: req.user.id })
  res.json({ ok: true, messageId: updated._id, readBy: updated.readBy, conversationId })
})

export default router
