import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  avatarUrl: String,
  avatarPublicId: String, 
  status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
  lastOnline: Date,
  // System-level role
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  // Account status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  // Admin-specific fields
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'manage_conversations', 
      'view_analytics',
      'moderate_messages',
      'manage_system'
    ]
  }],
  settings: {
    notifications: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    allowDirectMessage: { type: Boolean, default: true },
    privacyLevel: { type: String, enum: ['public', 'friends', 'private'], default: 'friends' }
  }
}, { timestamps: true, strict: true  })

UserSchema.index({ email: 1 }, { unique: true })  
UserSchema.index({ lastOnline: -1 })
UserSchema.index({ role: 1, isActive: 1 })
UserSchema.index({ isActive: 1, isVerified: 1 })         

export const User = mongoose.model('User', UserSchema)