import mongoose from 'mongoose'

const FriendshipSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Types.ObjectId, ref: 'User', index: true, required: true },
  receiverId:  { type: mongoose.Types.ObjectId, ref: 'User', index: true, required: true },
  status:      { type: String, enum: ['pending','accepted','blocked'], default: 'pending', index: true }
}, { timestamps: true })

// indexes theo spec
FriendshipSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true })
FriendshipSchema.index({ receiverId: 1, status: 1 })

export const Friendship = mongoose.model('Friendship', FriendshipSchema)
