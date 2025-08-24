import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: 'User', index: true, required: true },
  type:   { type: String, enum: ['new_message','mention','invite_group','friend_request'], required: true },
  data:   { type: Object, default: {} },
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true })

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 }) // theo spec

export const Notification = mongoose.model('Notification', NotificationSchema)
