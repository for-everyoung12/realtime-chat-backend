import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'
import * as friendService from './friend.service.js'

const router = Router()
router.use(authRequired)

/**
 * @swagger
 * /v1/friend/request:
 *   post:
 *     tags: ["Friends"]
 *     summary: Send a friend request
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Friendship created
 */

router.post('/request', async (req, res, next) => {
  try {
    const { receiverId } = req.body
    const friendship = await friendService.requestFriend({ 
      requesterId: req.user.id, 
      receiverId 
    })
    res.status(201).json(friendship)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/accept:
 *   post:
 *     tags: ["Friends"]
 *     summary: Accept a friend request
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requesterId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Friendship accepted
 */
router.post('/accept', async (req, res, next) => {
  try {
    const { requesterId } = req.body
    const friendship = await friendService.acceptFriend({ 
      requesterId, 
      receiverId: req.user.id 
    })
    res.json(friendship)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/reject:
 *   post:
 *     tags: ["Friends"]
 *     summary: Reject a friend request
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requesterId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Friendship rejected
 */
router.post('/reject', async (req, res, next) => {
  try {
    const { requesterId } = req.body
    const friendship = await friendService.rejectFriend({ 
      requesterId, 
      receiverId: req.user.id 
    })
    res.json(friendship)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/block:
 *   post:
 *     tags: ["Friends"]
 *     summary: Block a user
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User blocked
 */
router.post('/block', async (req, res, next) => {
  try {
    const { userId } = req.body
    const blocked = await friendService.blockUser({ 
      userId: req.user.id, 
      otherId: userId 
    })
    res.json(blocked)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/unblock:
 *   post:
 *     tags: ["Friends"]
 *     summary: Unblock a user
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User unblocked
 */
router.post('/unblock', async (req, res, next) => {
  try {
    const { userId } = req.body
    const result = await friendService.unblockUser({ 
      userId: req.user.id, 
      otherId: userId 
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/remove:
 *   post:
 *     tags: ["Friends"]
 *     summary: Remove a friend
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Friendship removed
 */
router.post('/remove', async (req, res, next) => {
  try {
    const { userId } = req.body
    const result = await friendService.removeFriend({ 
      userId: req.user.id, 
      otherId: userId 
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/list:
 *   get:
 *     tags: ["Friends"]
 *     summary: List friends
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, blocked]
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
 *         description: Friends list
 */
router.get('/list', async (req, res, next) => {
  try {
    const { status = 'accepted', cursor, limit = 20 } = req.query
    const result = await friendService.listFriends({ 
      userId: req.user.id, 
      status, 
      cursor, 
      limit: parseInt(limit) 
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/pending:
 *   get:
 *     tags: ["Friends"]
 *     summary: List pending friend requests
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
 *         description: Pending requests
 */
router.get('/pending', async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query
    const result = await friendService.listPendingRequests({ 
      userId: req.user.id, 
      cursor, 
      limit: parseInt(limit) 
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/stats:
 *   get:
 *     tags: ["Friends"]
 *     summary: Get friendship stats
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await friendService.getFriendshipStats({ 
      userId: req.user.id 
    })
    res.json(stats)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /v1/friend/status/{userId}:
 *   get:
 *     tags: ["Friends"]
 *     summary: Check friendship status with another user
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friendship status
 */
router.get('/status/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params
    const status = await friendService.checkFriendshipStatus({ 
      userId1: req.user.id, 
      userId2: userId 
    })
    res.json(status)
  } catch (error) {
    next(error)
  }
})

export default router


