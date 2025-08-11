import mongoose from 'mongoose'
import { Conversation, Message } from './chat.repo.js'
import { isMember } from '../common/cache/member.js'

const isOID = mongoose.isValidObjectId
const OID_MAX = new mongoose.Types.ObjectId('ffffffffffffffffffffffff')

// kiểm tra quyền vào room
export async function ensureMember (conversationId, userId) {
  const ok = await isMember(conversationId, userId)
  if (!ok) { const e = new Error('FORBIDDEN'); e.status = 403; throw e }
}

// ===== Conversation =====
export async function createConversation ({ type, name, memberIds }) {
  if (!['single', 'group'].includes(type)) throw bad('INVALID_TYPE', 400)
  if (!Array.isArray(memberIds) || memberIds.length < 2) throw bad('MEMBERS_REQUIRED', 400)

  const members = memberIds.map(id => ({ userId: new mongoose.Types.ObjectId(id), role: 'member' }))
  if (type === 'group' && name && name.length > 120) throw bad('NAME_TOO_LONG', 400)

  // De-dup single chat: nếu đã có conv 2 người này thì trả conv cũ
  if (type === 'single' && memberIds.length === 2) {
    const exist = await Conversation.findOne({
      type: 'single',
      'members.userId': { $all: members.map(m => m.userId) },
      $where: 'this.members.length === 2'
    })
    if (exist) return exist
  }
  return Conversation.create({ type, name, members })
}

export async function listConversations (userId, { cursor, limit = 20 }) {
  const uid = new mongoose.Types.ObjectId(userId)
  const q = { 'members.userId': uid }
  const sort = { updatedAt: -1, _id: -1 }

  if (cursor) q.$or = [
    { updatedAt: { $lt: new Date(cursor) } },
    { updatedAt: new Date(cursor), _id: { $lt: OID_MAX } }
  ]

  const rows = await Conversation.find(q)
  .sort(sort)
  .limit(limit)
  .select({name: 1, avatarUrl: 1, updatedAt: 1, lastMessage: 1, 'member.userId': 1, type: 1})
  .lean()

  const nextCursor = rows.length ? rows[rows.length - 1].updatedAt.toISOString() : null
  return { rows, nextCursor }
}

// ===== Message =====
export async function listMessages (conversationId, { cursor, limit = 50 }) {
  if (!isOID(conversationId)) throw bad('INVALID_CONVERSATION_ID', 400)
  const cid = new mongoose.Types.ObjectId(conversationId)
  const q = { conversationId: cid }
  const sort = { createdAt: -1, _id: -1 }

  if (cursor) q.$or = [
    { createdAt: { $lt: new Date(cursor) } },
    { createdAt: new Date(cursor), _id: { $lt: OID_MAX } }
  ]

  const rows = await Message.find(q)
  .sort(sort)
  .limit(limit)
  .select({ conversationId: 1, senderId: 1, type: 1, content: 1, fileUrl: 1, metadata: 1, createdAt: 1, readBy: 1, clientMsgId: 1 })
  .lean()
  const nextCursor = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null
  return { rows: rows.reverse(), nextCursor }
}

export async function createMessage ({ conversationId, senderId, type, content, fileUrl, metadata, clientMsgId }) {
  if (!isOID(conversationId)) throw bad('INVALID_CONVERSATION_ID', 400)
  if (!isOID(senderId)) throw bad('INVALID_SENDER_ID', 400)
  await ensureMember(conversationId, senderId)

  if (!['text', 'image', 'file', 'system'].includes(type)) throw bad('INVALID_TYPE', 400)
  if (type === 'text' && (!content || typeof content !== 'string')) throw bad('CONTENT_REQUIRED', 400)
  if (content && content.length > 4000) throw bad('CONTENT_TOO_LONG', 400)

  // Idempotency: nếu clientMsgId trùng trong cùng conversation → trả message cũ
  if (clientMsgId) {
    const dup = await Message.findOne({ conversationId, clientMsgId })
    if (dup) return dup
  }

    try {
    const msg = await Message.create({ conversationId, senderId, type, content, fileUrl, metadata, clientMsgId })

    await Conversation.findOneAndUpdate(
      { _id: conversationId, $or: [
        { 'lastMessage.createdAt': { $lt: msg.createdAt } },
        { lastMessage: { $exists: false } }
      ]},
      {
        $set: {
          lastMessage: {
            messageId: msg._id,
            senderId: msg.senderId,
            content: type === 'text' ? msg.content : `[${type}]`,
            createdAt: msg.createdAt
          }
        },
        $currentDate: { updatedAt: true }
      },
      { new: true }
    )

    return msg
  } catch (e) {
    // đụng unique index (conversationId, clientMsgId) → đọc lại bản đã tồn tại
    if (e?.code === 11000 && clientMsgId) {
      return await Message.findOne({ conversationId, clientMsgId })
    }
    throw e
  }
}

// edit: chỉnh sửa tin nhắn

// del: thu hồi tin nhắn

export async function markMessageRead ({ messageId, userId }) {
  if (!isOID(messageId)) throw bad('INVALID_MESSAGE_ID', 400)
  if (!isOID(userId)) throw bad('INVALID_USER_ID', 400)

  const msg = await Message.findById(messageId, { conversationId: 1 })
  if (!msg) throw bad('MESSAGE_NOT_FOUND', 404)

  // chỉ member mới được đọc
  await ensureMember(msg.conversationId, userId)

  const updated = await Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }, // idempotent
    { new: true }
  )
  return { updated, conversationId: msg.conversationId }
}

// ===== util =====
function bad (message, status) { const e = new Error(message); e.status = status; return e }
