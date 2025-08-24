import { Router } from 'express'
import { login, logout, register } from './auth.service.js'
import { authRequired } from './auth.js'
import { User } from '../db/user.model.js'

const router = Router()

// POST /v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const user = await register({ name, email, password })
    res.status(201).json({ id: user._id, email: user.email, name: user.name })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'REGISTER_FAILED' })
  }
})

// POST /v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await login({ email, password }, res)
    res.json({ id: user._id, email: user.email, name: user.name })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'LOGIN_FAILED' })
  }
})

// POST /v1/auth/logout
router.post('/logout', authRequired, async (req, res) => {
  try { await logout(res); res.json({ ok: true }) } catch { res.status(500).json({ error: 'LOGOUT_FAILED' }) }
})

// GET /v1/auth/me
router.get('/me', authRequired, async (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, name: req.user.name })
})

// PATCH /v1/auth/status
router.patch('/status', authRequired, async (req, res) => {
  const { status } = req.body || {}
  if (!['online', 'offline', 'busy'].includes(status)) {
    return res.status(400).json({ error: 'INVALID_STATUS' })
  }

  // Nếu offline thì cập nhật lastOnline = now, còn lại giữ nguyên
  const update = { $set: { status } }
  if (status === 'offline') update.$set.lastOnline = new Date()

  // Cập nhật updatedAt bằng $currentDate (chắc chắn) + trả về document mới
  const updated = await User.findByIdAndUpdate(
    req.user.id,
    { ...update, $currentDate: { updatedAt: true } },
    { new: true }
  ).select({ name: 1, email: 1, status: 1, lastOnline: 1, updatedAt: 1 })

  if (!updated) {
    return res.status(404).json({ error: 'USER_NOT_FOUND' })
  }
  res.json({ ok: true, user: updated })
})



export default router