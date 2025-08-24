import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'
import * as svc from './friend.service.js'

const router = Router()
router.use(authRequired)

router.post('/request', async (req, res, next) => {
  try {
    const doc = await svc.requestFriend({ requesterId: req.user.id, receiverId: req.body.receiverId })
    res.json(doc)
  } catch (e) { next(e) }
})

router.post('/accept', async (req, res, next) => {
  try {
    const doc = await svc.acceptFriend({ requesterId: req.body.requesterId, receiverId: req.user.id })
    res.json(doc)
  } catch (e) { next(e) }
})

router.post('/block', async (req, res, next) => {
  try {
    const doc = await svc.blockUser({ userId: req.user.id, blockedUserId: req.body.userId })
    res.json(doc)
  } catch (e) { next(e) }
})

// list pending / accepted cho UI
router.get('/list', async (req, res, next) => {
  try {
    const { status = 'accepted' } = req.query
    const rows = await svc.listFriends({ userId: req.user.id, status })
    res.json({ rows })
  } catch (e) { next(e) }
})

export default router
