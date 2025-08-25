import mongoose from 'mongoose'
import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'
import { listNotifications, markRead } from './notify.service.js'

const router = Router()

/**
 * @swagger
 * /v1/notify:
 *   get:
 *     tags: ["Notifications"]
 *     summary: List notifications for current user
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
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Notification list
 */
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

/**
 * @swagger
 * /v1/notify/{id}/read:
 *   patch:
 *     tags: ["Notifications"]
 *     summary: Mark a notification as read
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
 *         description: Notification marked as read
 */
// PATCH /v1/notify/:id/read
router.patch('/:id/read', authRequired, async (req, res) => {
  const { id } = req.params
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'INVALID_ID' })
  const n = await markRead(id, req.user.id)
  res.json({ ok: true, id: n._id })
})

export default router
