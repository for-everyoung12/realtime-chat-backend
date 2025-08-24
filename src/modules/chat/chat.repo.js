import mongoose from 'mongoose'

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['single', 'group'], required: true },
  name: String,
  avatarUrl: String,
  members: [{
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  lastMessage: {
    messageId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,  
    content: String,
    createdAt: Date
  }
}, { timestamps: true, strict : true })
// Lấy conversations của user theo thời gian cập nhật (cursor-friendly)
ConversationSchema.index({ 'members.userId': 1, updatedAt: -1, _id: -1 })
ConversationSchema.index({ updatedAt: -1 });

// Chặn client/chỗ khác set updatedAt bậy → luôn để Mongo tự cập nhật
ConversationSchema.pre(['updateOne','findOneAndUpdate','updateMany'], function () {
  const u = this.getUpdate && this.getUpdate()
  if (u && u.$set && Object.prototype.hasOwnProperty.call(u.$set, 'updatedAt')) {
    delete u.$set.updatedAt
  }
})

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Types.ObjectId, ref: 'Conversation', index: true, required: true },
  senderId: { type: mongoose.Types.ObjectId, ref: 'User', index: true, required: true },
  type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  content: { type: String, default: '' },
  fileUrl: { type: String }, 
  metadata: { size: Number, mimeType: String },

   // idempotency từ client
  clientMsgId: { type: String, index: true },  // UUID/ULID từ client

  readBy: [{ type: mongoose.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })
MessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 })
MessageSchema.index({ senderId: 1, createdAt: -1 })

MessageSchema.index(
  { conversationId: 1, clientMsgId: 1 },
  { unique: true, partialFilterExpression: { clientMsgId: { $type: 'string' } } }
)

export const Conversation = mongoose.model('Conversation', ConversationSchema)
export const Message = mongoose.model('Message', MessageSchema)