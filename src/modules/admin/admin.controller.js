import { Router } from 'express'
import { authRequired } from '../common/auth/auth.js'
import { requireAdmin, requirePermission } from '../common/auth/authorization.js'
import { getUserStats } from '../user/user.service.js'
import { Conversation, Message } from '../chat/chat.repo.js'
import { User } from '../common/db/user.model.js'
import { Notification } from '../notify/notify.repo.js'
import mongoose from 'mongoose'

const router = Router()

// GET /v1/admin/dashboard
router.get('/dashboard', authRequired, requirePermission('view_analytics'), async (req, res) => {
  try {
    // Get user statistics
    const userStats = await getUserStats()
    
    // Get conversation statistics
    const conversationStats = await Conversation.aggregate([
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          groupConversations: { $sum: { $cond: [{ $eq: ['$type', 'group'] }, 1, 0] } },
          singleConversations: { $sum: { $cond: [{ $eq: ['$type', 'single'] }, 1, 0] } }
        }
      }
    ])
    
    // Get message statistics
    const messageStats = await Message.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          textMessages: { $sum: { $cond: [{ $eq: ['$type', 'text'] }, 1, 0] } },
          imageMessages: { $sum: { $cond: [{ $eq: ['$type', 'image'] }, 1, 0] } },
          fileMessages: { $sum: { $cond: [{ $eq: ['$type', 'file'] }, 1, 0] } }
        }
      }
    ])
    
    // Get recent activity
    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('senderId', 'name email')
      .populate('conversationId', 'name type')
      .lean()
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role createdAt')
      .lean()
    
    res.json({
      users: userStats,
      conversations: conversationStats[0] || {},
      messages: messageStats[0] || {},
      recentActivity: {
        messages: recentMessages,
        users: recentUsers
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /v1/admin/conversations
router.get('/conversations', authRequired, requirePermission('view_all_conversations'), async (req, res) => {
  try {
    const { cursor, limit = 20, type, search } = req.query
    const query = {}
    
    if (type) {
      query.type = type
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }
    
    if (cursor) {
      const cur = new Date(cursor)
      if (isNaN(cur)) return res.status(400).json({ error: 'INVALID_CURSOR' })
      query.$or = [
        { createdAt: { $lt: cur } },
        { createdAt: cur, _id: { $lt: 'ffffffffffffffffffffffff' } }
      ]
    }
    
    const conversations = await Conversation.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(Number(limit))
      .populate('members.userId', 'name email role')
      .lean()
    
    const nextCursor = conversations.length ? conversations[conversations.length - 1].createdAt.toISOString() : null
    
    res.json({ conversations, nextCursor })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /v1/admin/conversations/:id
router.delete('/conversations/:id', authRequired, requirePermission('delete_conversations'), async (req, res) => {
  try {
    const conversation = await Conversation.findByIdAndDelete(req.params.id)
    if (!conversation) {
      return res.status(404).json({ error: 'CONVERSATION_NOT_FOUND' })
    }
    
    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId: req.params.id })
    
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /v1/admin/messages
router.get('/messages', authRequired, requirePermission('moderate_messages'), async (req, res) => {
  try {
    const { cursor, limit = 50, conversationId, senderId, type } = req.query
    const query = {}
    
    if (conversationId) {
      query.conversationId = conversationId
    }
    
    if (senderId) {
      query.senderId = senderId
    }
    
    if (type) {
      query.type = type
    }
    
    if (cursor) {
      const cur = new Date(cursor)
      if (isNaN(cur)) return res.status(400).json({ error: 'INVALID_CURSOR' })
      query.$or = [
        { createdAt: { $lt: cur } },
        { createdAt: cur, _id: { $lt: 'ffffffffffffffffffffffff' } }
      ]
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(Number(limit))
      .populate('senderId', 'name email role')
      .populate('conversationId', 'name type')
      .lean()
    
    const nextCursor = messages.length ? messages[messages.length - 1].createdAt.toISOString() : null
    
    res.json({ messages, nextCursor })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /v1/admin/messages/:id
router.delete('/messages/:id', authRequired, requirePermission('delete_messages'), async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id)
    if (!message) {
      return res.status(404).json({ error: 'MESSAGE_NOT_FOUND' })
    }
    
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /v1/admin/notifications
router.get('/notifications', authRequired, requirePermission('view_analytics'), async (req, res) => {
  try {
    const { cursor, limit = 50, type, isRead } = req.query
    const query = {}
    
    if (type) {
      query.type = type
    }
    
    if (isRead !== undefined) {
      query.isRead = isRead === 'true'
    }
    
    if (cursor) {
      const cur = new Date(cursor)
      if (isNaN(cur)) return res.status(400).json({ error: 'INVALID_CURSOR' })
      query.$or = [
        { createdAt: { $lt: cur } },
        { createdAt: cur, _id: { $lt: 'ffffffffffffffffffffffff' } }
      ]
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(Number(limit))
      .populate('userId', 'name email')
      .lean()
    
    const nextCursor = notifications.length ? notifications[notifications.length - 1].createdAt.toISOString() : null
    
    res.json({ notifications, nextCursor })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /v1/admin/system/health
router.get('/system/health', authRequired, requirePermission('view_analytics'), async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        collections: Object.keys(mongoose.connection.collections).length
      }
    }
    
    res.json(health)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
