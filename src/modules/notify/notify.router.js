import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'

const router = Router()
router.get('/', authRequired, (req, res) => res.json({ rows: [], nextCursor: null }))
router.patch('/:id/read', authRequired, (req, res) => res.json({ ok: true }))
export default router