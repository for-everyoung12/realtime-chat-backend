import mongoose from 'mongoose'

const FriendshipSchema = new mongoose.Schema({
  requesterId: { 
    type: mongoose.Types.ObjectId, 
    ref: 'User', 
    index: true, 
    required: true 
  },
  receiverId: { 
    type: mongoose.Types.ObjectId, 
    ref: 'User', 
    index: true, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'blocked', 'rejected'], 
    default: 'pending', 
    index: true 
  },
  blockedBy: {
    type: mongoose.Types.ObjectId,
    ref: 'User'
  },
  blockedAt: {
    type: Date
  }
}, { 
  timestamps: true 
})

// Compound indexes
FriendshipSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true })
FriendshipSchema.index({ receiverId: 1, status: 1 })
FriendshipSchema.index({ requesterId: 1, status: 1 })
FriendshipSchema.index({ blockedBy: 1 })

export const Friendship = mongoose.model('Friendship', FriendshipSchema)

export class FriendRepository {
  // Basic CRUD operations
  static async findById(id, projection = {}) {
    return Friendship.findById(id, projection).lean()
  }

  static async create(friendshipData) {
    return Friendship.create(friendshipData)
  }

  static async updateById(id, updateData, options = {}) {
    return Friendship.findByIdAndUpdate(id, updateData, { new: true, ...options })
  }

  static async deleteById(id) {
    return Friendship.findByIdAndDelete(id)
  }

  // Find friendship between two users
  static async findFriendship(userId1, userId2, projection = {}) {
    return Friendship.findOne({
      $or: [
        { requesterId: userId1, receiverId: userId2 },
        { requesterId: userId2, receiverId: userId1 }
      ]
    }, projection).lean()
  }

  // Find friendships by user and status
  static async findFriendshipsByUser(userId, status, options = {}) {
    const { limit = 50, cursor, populate = false } = options
    
    let query = Friendship.find({
      $or: [
        { requesterId: userId },
        { receiverId: userId }
      ],
      status
    })

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

    query = query
      .sort({ createdAt: -1 })
      .limit(limit)

    if (populate) {
      query = query.populate([
        { path: 'requesterId', select: 'name email avatarUrl status' },
        { path: 'receiverId', select: 'name email avatarUrl status' }
      ])
    }

    return query.lean()
  }

  // Find pending requests for a user
  static async findPendingRequests(userId, options = {}) {
    const { limit = 20, cursor, populate = false } = options
    
    let query = Friendship.find({
      receiverId: userId,
      status: 'pending'
    })

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

    query = query
      .sort({ createdAt: -1 })
      .limit(limit)

    if (populate) {
      query = query.populate('requesterId', 'name email avatarUrl status')
    }

    return query.lean()
  }

  // Update friendship status
  static async updateStatus(requesterId, receiverId, status, additionalData = {}) {
    const updateData = { status, ...additionalData }
    
    if (status === 'blocked') {
      updateData.blockedBy = requesterId
      updateData.blockedAt = new Date()
    } else {
      updateData.$unset = { blockedBy: 1, blockedAt: 1 }
    }

    return Friendship.findOneAndUpdate(
      { requesterId, receiverId },
      { $set: updateData },
      { new: true }
    )
  }

  // Delete all friendships between two users
  static async deleteFriendship(userId1, userId2) {
    return Friendship.deleteMany({
      $or: [
        { requesterId: userId1, receiverId: userId2 },
        { requesterId: userId2, receiverId: userId1 }
      ]
    })
  }

  // Get friendship statistics
  static async getStats(userId) {
    const stats = await Friendship.aggregate([
      {
        $match: {
          $or: [
            { requesterId: new mongoose.Types.ObjectId(userId) },
            { receiverId: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count
      return acc
    }, {})
  }

  // Check if users are friends
  static async areFriends(userId1, userId2) {
    const friendship = await this.findFriendship(userId1, userId2, { status: 1 })
    return friendship?.status === 'accepted'
  }

  // Check if user is blocked
  static async isBlocked(userId1, userId2) {
    const friendship = await this.findFriendship(userId1, userId2, { status: 1, blockedBy: 1 })
    return friendship?.status === 'blocked' && friendship?.blockedBy?.toString() === userId1
  }
}
