import { Router } from 'express'
import { login, logout, register } from './auth.service.js'
import { authRequired } from './auth.js'

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
  res.json({ id: req.user.id, email: req.user.email })
})

export default router