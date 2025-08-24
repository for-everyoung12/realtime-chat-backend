import mongoose from 'mongoose'
import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'
import { listNotifications, markRead } from './notify.service.js'

const router = Router()

// GET /v1/notify?cursor&limit&unreadOnly=true|false
router.get('/', authRequired, async (req, res) => {
  const { cursor, limit, unreadOnly } = req.query
  const data = await listNotifications(req.user.id, {
    cursor,
    limit: Number(limit || 20),
    unreadOnly: String(unreadOnly) === 'true'
  })
  res.json(data)
})

// PATCH /v1/notify/:id/read
router.patch('/:id/read', authRequired, async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'INVALID_ID' })
  const n = await markRead(id, req.user.id)
  res.json({ ok: true, id: n._id })
})

export default router
