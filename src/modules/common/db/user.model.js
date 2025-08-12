import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  avatarUrl: String,
  status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
  lastOnline: Date,
  settings: {
    notifications: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    allowDirectMessage: { type: Boolean, default: true }
  }
}, { timestamps: true, strict: true  })

UserSchema.index({ email: 1 }, { unique: true })  
UserSchema.index({ lastOnline: -1 })         

export const User = mongoose.model('User', UserSchema)