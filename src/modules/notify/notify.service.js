import mongoose from 'mongoose'
import { Notification } from './notify.repo.js'

export async function listNotifications (userId, { cursor, limit = 20, unreadOnly = false }) {
  const q = { userId: new mongoose.Types.ObjectId(userId) }
  if (unreadOnly) q.isRead = false
  if (cursor && !Number.isNaN(Date.parse(cursor))) {
    q.$or = [
      { createdAt: { $lt: new Date(cursor) } },
      { createdAt: new Date(cursor), _id: { $lt: new mongoose.Types.ObjectId('ffffffffffffffffffffffff') } }
    ]
  }
  const rows = await Notification.find(q).sort({ createdAt: -1, _id: -1 }).limit(limit)
  const nextCursor = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null
  return { rows, nextCursor }
}

export async function markRead (id, userId) {
  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { $set: { isRead: true } },
    { new: true }
  )
  if (!updated) { const e = new Error('NOTIFICATION_NOT_FOUND'); e.status = 404; throw e }
  return updated
}

// tiện ích để tạo notify từ nơi khác (chat, friend,…)
export async function createNotify ({ userId, type, data }) {
  return Notification.create({ userId, type, data })
}
