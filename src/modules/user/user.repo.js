import { User } from '../common/db/user.model.js'
import mongoose from 'mongoose'

export class UserRepository {
  // Basic CRUD operations
  static async findById(id, projection = {}) {
    return User.findById(id, projection).lean()
  }

  static async findByEmail(email, projection = {}) {
    return User.findOne({ email }, projection).lean()
  }

  static async create(userData) {
    return User.create(userData)
  }

  static async updateById(id, updateData, options = {}) {
    return User.findByIdAndUpdate(id, updateData, { new: true, ...options })
  }

  static async deleteById(id) {
    return User.findByIdAndDelete(id)
  }

  // Query operations
  static async findWithFilters(filters = {}, options = {}) {
    const { cursor, limit = 20, sort = { createdAt: -1 } } = options
    
    let query = User.find(filters)
    
    if (cursor) {
      const cur = new Date(cursor)
      if (!isNaN(cur)) {
        query = query.find({
          $or: [
            { createdAt: { $lt: cur } },
            { createdAt: cur, _id: { $lt: new mongoose.Types.ObjectId('ffffffffffffffffffffffff') } }
          ]
        })
      }
    }
    
    return query
      .sort(sort)
      .limit(limit)
      .select(options.projection || {})
      .lean()
  }

  // Admin operations
  static async getStats() {
    return User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
          onlineUsers: { $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          activeUsers: 1,
          verifiedUsers: 1,
          onlineUsers: 1,
          inactiveUsers: { $subtract: ['$totalUsers', '$activeUsers'] }
        }
      }
    ])
  }

  static async getRoleStats() {
    return User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ])
  }

  // Avatar operations
  static async updateAvatar(userId, avatarData) {
    return User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          avatarUrl: avatarData.secure_url, 
          avatarPublicId: avatarData.public_id 
        } 
      },
      { new: true, projection: { name: 1, email: 1, avatarUrl: 1 } }
    )
  }

  // Status operations
  static async updateStatus(userId, status) {
    return User.findByIdAndUpdate(
      userId,
      { 
        $set: { status },
        ...(status === 'offline' && { $set: { lastOnline: new Date() } })
      },
      { new: true }
    )
  }

  // Ban operations
  static async banUser(userId, banData) {
    return User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          isActive: false,
          'settings.banReason': banData.reason,
          'settings.bannedBy': banData.bannedBy,
          'settings.bannedAt': new Date()
        }
      },
      { new: true, projection: { name: 1, email: 1, isActive: 1 } }
    )
  }

  static async unbanUser(userId) {
    return User.findByIdAndUpdate(
      userId,
      { 
        $set: { isActive: true },
        $unset: { 
          'settings.banReason': 1,
          'settings.bannedBy': 1,
          'settings.bannedAt': 1
        }
      },
      { new: true, projection: { name: 1, email: 1, isActive: 1 } }
    )
  }
}
