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

/**
 * @swagger
 * /v1/chat/conversations:
 *   get:
 *     tags: ["Chat"]
 *     summary: List conversations for current user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conversation list
 *   post:
 *     tags: ["Chat"]
 *     summary: Create a conversation
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, memberIds]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [single, group]
 *               name:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 */
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
  const conv = await createConversation({ type, name, memberIds, creatorId: req.user.id })
  res.status(201).json(conv)
})

/**
 * @swagger
 * /v1/chat/messages:
 *   get:
 *     tags: ["Chat"]
 *     summary: List messages in a conversation
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Messages
 *   post:
 *     tags: ["Chat"]
 *     summary: Send a message
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId, type]
 *             properties:
 *               conversationId: { type: string }
 *               type:
 *                 type: string
 *                 enum: [text, image, file, system]
 *               content: { type: string }
 *               fileUrl: { type: string }
 *               metadata: { type: object }
 *               clientMsgId: { type: string }
 */
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

/**
 * @swagger
 * /v1/chat/messages/{id}/read:
 *   patch:
 *     tags: ["Chat"]
 *     summary: Mark a message as read
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Read receipt updated
 */
// PATCH /v1/chat/messages/:id/read
router.patch('/messages/:id/read', authRequired, async (req, res) => {
  const { id } = req.params
  const { updated, conversationId } = await markMessageRead({ messageId: id, userId: req.user.id })
  res.json({ ok: true, messageId: updated._id, readBy: updated.readBy, conversationId })
})

export default router
