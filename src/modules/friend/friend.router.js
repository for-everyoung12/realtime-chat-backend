import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'

const router = Router()
router.post('/request', authRequired, (req, res) => res.status(201).json({ ok: true }))
router.post('/accept', authRequired, (req, res) => res.json({ ok: true }))
router.post('/block', authRequired, (req, res) => res.json({ ok: true }))
export default router