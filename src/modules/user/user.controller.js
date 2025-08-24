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
  getUserProfile
} from './user.service.js'

const router = Router()

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

// GET /v1/user/profile/:id
router.get('/profile/:id', authRequired, async (req, res) => {
  try {
    const user = await getUserProfile(req.params.id, req.user.id)
    res.json(user)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// PUT /v1/user/profile
router.put('/profile', authRequired, async (req, res) => {
  try {
    const user = await updateUserProfile(req.user.id, req.body)
    res.json(user)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

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

// GET /v1/user/admin/stats
router.get('/admin/stats', authRequired, requirePermission('view_analytics'), async (req, res) => {
  try {
    const stats = await getUserStats()
    res.json(stats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

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
