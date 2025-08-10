import mongoose from 'mongoose'
import { Conversation, Message } from './chat.repo.js'

export async function listConversations (userId, { cursor, limit = 20 }) {
  const q = { 'members.userId': userId }
  const sort = { updatedAt: -1, _id: -1 }
  if (cursor) q.$or = [{ updatedAt: { $lt: new Date(cursor) } }, { updatedAt: new Date(cursor), _id: { $lt: cursor } }]
  const rows = await Conversation.find(q).sort(sort).limit(limit)
  const nextCursor = rows.length ? rows[rows.length - 1].updatedAt.toISOString() : null
  return { rows, nextCursor }
}

export async function listMessages (conversationId, { cursor, limit = 50 }) {
  const q = { conversationId }
  const sort = { createdAt: -1, _id: -1 }
  if (cursor) q.$or = [{ createdAt: { $lt: new Date(cursor) } }, { createdAt: new Date(cursor), _id: { $lt: cursor } }]
  const rows = await Message.find(q).sort(sort).limit(limit)
  const nextCursor = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null
  return { rows: rows.reverse(), nextCursor }
}

export async function createMessage ({ conversationId, senderId, type, content, fileUrl }) {
  const msg = await Message.create({ conversationId, senderId, type, content, fileUrl })
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { lastMessage: { messageId: msg._id, senderId: msg.senderId, content: msg.content, createdAt: msg.createdAt } }
  }, { new: true })
  return msg
}

export async function markMessageRead ({ messageId, userId }) {
  if (!isOID(messageId)) {
    const e = new Error('INVALID_MESSAGE_ID'); e.status = 400; throw e
  }
  if (!isOID(userId)) {
    const e = new Error('INVALID_USER_ID'); e.status = 400; throw e
  }

  // Lấy message để biết conversationId (phục vụ broadcast)
  const msg = await Message.findById(messageId)
  if (!msg) {
    const e = new Error('MESSAGE_NOT_FOUND'); e.status = 404; throw e
  }

  // Idempotent: không thêm trùng user
  const updated = await Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } },
    { new: true }
  )

  return { updated, conversationId: msg.conversationId }
}