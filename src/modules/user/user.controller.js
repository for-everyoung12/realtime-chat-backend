import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'
import { requireAdmin, requireModerator, requirePermission } from '../common/auth/authorization.js'
import { avatarUpload } from '../common/upload/multer.js'
import { 
  uploadAvatarAndSave, 
  listUsers, 
  updateUserRole, 
  banUser, 
  unbanUser, 
  getUserStats,
  updateUserProfile,
  getUserProfile,
  searchUsers
} from './user.service.js'
import { sendLimiter as searchLimiter } from '../common/http/middlewares.js'

const router = Router()

/**
 * @swagger
 * /v1/user/avatar:
 *   post:
 *     tags: ["Users"]
 *     summary: Upload user avatar
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 */
// User profile endpoints
// POST /v1/user/avatar  (form-data: avatar=<file>)
router.post('/avatar', authRequired, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'FILE_REQUIRED' })
    const user = await uploadAvatarAndSave(req.user.id, req.file.buffer, req.file.mimetype)
    res.json({ ok: true, avatarUrl: user.avatarUrl })
  } catch (e) {
    if (e.message === 'UNSUPPORTED_MIME') return res.status(415).json({ error: 'UNSUPPORTED_MIME' })
    if (e.message?.includes('File too large')) return res.status(413).json({ error: 'FILE_TOO_LARGE' })
    res.status(500).json({ error: 'UPLOAD_FAILED' })
  }
})


/**
 * @swagger
 * /v1/user/search:
 *   get:
 *     tags: ["Users"]
 *     summary: Search users to invite
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search by name or email (case-insensitive)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Base64 cursor for keyset pagination
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rows:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       friendship:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             enum: [none, pending, accepted, blocked]
 *                 nextCursor:
 *                   type: string
 */
// GET /v1/user/search?q=...&cursor=...&limit=20
router.get('/search', authRequired, searchLimiter, async (req, res) => {
  try {
    const { q, cursor, limit } = req.query
    const data = await searchUsers({ currentUserId: req.user.id, q, cursor, limit: Math.min(Number(limit) || 20, 50) })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

/**
 * @swagger
 * /v1/user/profile/{id}:
 *   get:
 *     tags: ["Users"]
 *     summary: Get user profile by id
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
 *         description: User profile
 */
// GET /v1/user/profile/:id
router.get('/profile/:id', authRequired, async (req, res) => {
  try {
    const user = await getUserProfile(req.params.id, req.user.id)
    res.json(user)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

/**
 * @swagger
 * /v1/user/profile:
 *   put:
 *     tags: ["Users"]
 *     summary: Update current user profile
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated profile
 */
// PUT /v1/user/profile
router.put('/profile', authRequired, async (req, res) => {
  try {
    const user = await updateUserProfile(req.user.id, req.body)
    res.json(user)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

/**
 * @swagger
 * /v1/user/admin/users:
 *   get:
 *     tags: ["Users"]
 *     summary: List users (admin)
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
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User list
 */
// Admin endpoints
// GET /v1/user/admin/users
router.get('/admin/users', authRequired, requirePermission('view_users'), async (req, res) => {
  try {
    const { cursor, limit, role, isActive, search } = req.query
    const data = await listUsers({ 
      cursor, 
      limit: Number(limit), 
      role, 
      isActive: isActive === 'true', 
      search 
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

/**
 * @swagger
 * /v1/user/admin/stats:
 *   get:
 *     tags: ["Users"]
 *     summary: User analytics (admin)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Stats
 */
// GET /v1/user/admin/stats
router.get('/admin/stats', authRequired, requirePermission('view_analytics'), async (req, res) => {
  try {
    const stats = await getUserStats()
    res.json(stats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/**
 * @swagger
 * /v1/user/admin/{id}/role:
 *   put:
 *     tags: ["Users"]
 *     summary: Update user role (admin)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, moderator, admin]
 *     responses:
 *       200:
 *         description: Updated role
 */
// PUT /v1/user/admin/:id/role
router.put('/admin/:id/role', authRequired, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body
    const user = await updateUserRole(req.params.id, role, req.user.id)
    res.json(user)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

/**
 * @swagger
 * /v1/user/admin/{id}/ban:
 *   post:
 *     tags: ["Users"]
 *     summary: Ban a user (admin)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Banned user
 */
// POST /v1/user/admin/:id/ban
router.post('/admin/:id/ban', authRequired, requirePermission('ban_users'), async (req, res) => {
  try {
    const { reason } = req.body
    const user = await banUser(req.params.id, reason, req.user.id)
    res.json(user)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

/**
 * @swagger
 * /v1/user/admin/{id}/unban:
 *   post:
 *     tags: ["Users"]
 *     summary: Unban a user (admin)
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
 *         description: Unbanned user
 */
// POST /v1/user/admin/:id/unban
router.post('/admin/:id/unban', authRequired, requirePermission('ban_users'), async (req, res) => {
  try {
    const user = await unbanUser(req.params.id, req.user.id)
    res.json(user)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router
