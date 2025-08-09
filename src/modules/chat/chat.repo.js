import mongoose from 'mongoose'

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['single', 'group'], required: true },
  name: String,
  avatarUrl: String,
  members: [{ userId: { type: mongoose.Types.ObjectId, ref: 'User' }, role: { type: String, enum: ['admin', 'member'], default: 'member' }, joinedAt: Date }],
  lastMessage: { messageId: mongoose.Types.ObjectId, senderId: mongoose.Types.ObjectId, content: String, createdAt: Date }
}, { timestamps: true })
ConversationSchema.index({ 'members.userId': 1, updatedAt: -1 })
ConversationSchema.index({ updatedAt: -1 })

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Types.ObjectId, ref: 'Conversation', index: true },
  senderId: { type: mongoose.Types.ObjectId, ref: 'User', index: true },
  type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  content: String,
  fileUrl: String,
  metadata: { size: Number, mimeType: String },
  readBy: [{ type: mongoose.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })
MessageSchema.index({ conversationId: 1, createdAt: -1 })
MessageSchema.index({ senderId: 1, createdAt: -1 })

export const Conversation = mongoose.model('Conversation', ConversationSchema)
export const Message = mongoose.model('Message', MessageSchema)