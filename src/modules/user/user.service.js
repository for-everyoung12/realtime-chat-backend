import streamifier from 'streamifier'
import { cloudinary } from '../common/thirdparty/cloudinary.js'
import { UserRepository } from './user.repo.js'
import { validateObjectId, validateEnum, validateString } from '../common/validation.js'
import { FriendRepository } from '../friend/friend.repo.js'
import mongoose from 'mongoose'

const encodeCursor = (doc) => Buffer.from(JSON.stringify({ t: (doc.updatedAt ?? doc.createdAt).toISOString(), id: String(doc._id) }), 'utf8').toString('base64')
const decodeCursor = (s) => {
  if (!s) return null
  try { return JSON.parse(Buffer.from(s, 'base64').toString('utf8')) } catch { return null }
}

export async function uploadAvatarAndSave(userId, fileBuffer, mimetype) {
  const folder = process.env.CLOUDINARY_FOLDER || 'chat-app/avatars'

  const uploadStream = (buffer) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        overwrite: true,
        transformation: [
          { width: 512, height: 512, crop: 'limit' },  
          { quality: 'auto', fetch_format: 'auto' }    
        ]
      },
      (err, result) => err ? reject(err) : resolve(result)
    )
    streamifier.createReadStream(buffer).pipe(stream)
  })

  const result = await uploadStream(fileBuffer)

  const prev = await UserRepository.findById(userId, { avatarPublicId: 1 })
  if (prev?.avatarPublicId && prev.avatarPublicId !== result.public_id) {
    cloudinary.uploader.destroy(prev.avatarPublicId).catch(() => {})
  }

  const updated = await UserRepository.updateAvatar(userId, result)
  return updated
}

export async function listUsers({ cursor, limit = 20, role, isActive, search }) {
  const query = {}
  
  if (role) {
    query.role = validateEnum(role, ['user', 'moderator', 'admin'], 'role')
  }
  
  if (isActive !== undefined) {
    query.isActive = Boolean(isActive)
  }
  
  if (search) {
    const searchStr = validateString(search, 'search', 100)
    query.$or = [
      { name: { $regex: searchStr, $options: 'i' } },
      { email: { $regex: searchStr, $options: 'i' } }
    ]
  }
  
  if (cursor) {
    const cur = new Date(cursor)
    if (isNaN(cur)) throw new Error('INVALID_CURSOR')
    query.$or = [
      { createdAt: { $lt: cur } },
      { createdAt: cur, _id: { $lt: 'ffffffffffffffffffffffff' } }
    ]
  }
  
  const users = await UserRepository.findWithFilters(query, {
    limit,
    sort: { createdAt: -1, _id: -1 },
    projection: { passwordHash: 0 }
  })
  
  const nextCursor = users.length ? users[users.length - 1].createdAt.toISOString() : null
  return { users, nextCursor }
}

// Search users (by name/email), exclude self and mutual blocks, include friendship.status
export async function searchUsers({ currentUserId, q, cursor, limit = 20 }) {
  if (!q || typeof q !== 'string') throw new Error('SEARCH_REQUIRED')
  if (q.trim().length < 2) throw new Error('SEARCH_TOO_SHORT')
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const cur = decodeCursor(cursor)

  const baseFilters = {
    _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
    isActive: true,
    $or: [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } }
    ]
  }

  const users = await UserRepository.searchUsers(baseFilters, {
    cursor: cur,
    limit: Math.min(Number(limit) || 20, 20),
    projection: { passwordHash: 0, permissions: 0, settings: 0 }
  })

  const otherIds = users.map(u => u._id)
  const blockedSet = await FriendRepository.findMutualBlockedIds(currentUserId, otherIds)
  const visible = users.filter(u => !blockedSet.has(String(u._id)))

  const friendships = await FriendRepository.findFriendshipsWith(currentUserId, visible.map(u => u._id))
  const map = new Map()
  for (const f of friendships) {
    const other = String(f.requesterId) === String(currentUserId) ? String(f.receiverId) : String(f.requesterId)
    map.set(other, f)
  }

  const rows = visible.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    updatedAt: u.updatedAt,
    friendship: map.has(String(u._id)) ? { status: map.get(String(u._id)).status } : { status: 'none' }
  }))

  const last = rows[rows.length - 1]
  const nextCursor = last ? encodeCursor(last) : null
  return { rows, nextCursor }
}

export async function updateUserRole(userId, newRole, updatedBy) {
  const validRoles = ['user', 'moderator', 'admin']
  const role = validateEnum(newRole, validRoles, 'role')
  
  // Prevent self-role-change
  if (String(userId) === String(updatedBy)) {
    throw new Error('CANNOT_CHANGE_OWN_ROLE')
  }
  
  // Only admins can assign admin role
  const updater = await UserRepository.findById(updatedBy, { role: 1 })
  if (role === 'admin' && updater.role !== 'admin') {
    throw new Error('INSUFFICIENT_PERMISSION')
  }
  
  const user = await UserRepository.updateById(
    userId,
    { role },
    { projection: { name: 1, email: 1, role: 1, isActive: 1 } }
  )
  
  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }
  
  return user
}

export async function banUser(userId, reason, bannedBy) {
  const user = await UserRepository.banUser(userId, { reason, bannedBy })
  
  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }
  
  return user
}

export async function unbanUser(userId, unbannedBy) {
  const user = await UserRepository.unbanUser(userId)
  
  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }
  
  return user
}

export async function getUserStats() {
  const [stats, roleStats] = await Promise.all([
    UserRepository.getStats(),
    UserRepository.getRoleStats()
  ])
  
  return {
    ...stats[0],
    roles: roleStats.reduce((acc, role) => {
      acc[role._id] = role.count
      return acc
    }, {})
  }
}

// User profile functions
export async function updateUserProfile(userId, updates) {
  const allowedFields = ['name', 'settings']
  const updateData = {}
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateData[key] = value
    }
  }
  
  const user = await UserRepository.updateById(
    userId,
    updateData,
    { projection: { name: 1, email: 1, avatarUrl: 1, settings: 1, role: 1 } }
  )
  
  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }
  
  return user
}

export async function getUserProfile(userId, requesterId) {
  const user = await UserRepository.findById(userId, {
    name: 1,
    email: 1,
    avatarUrl: 1,
    status: 1,
    lastOnline: 1,
    settings: 1,
    role: 1,
    isActive: 1,
    isVerified: 1
  })
  
  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }
  
  // Check privacy settings
  const requester = await UserRepository.findById(requesterId, { role: 1 })
  const isAdmin = requester.role === 'admin'
  const isSelf = String(userId) === String(requesterId)
  
  // Apply privacy filters
  if (!isAdmin && !isSelf) {
    if (user.settings.privacyLevel === 'private') {
      throw new Error('PROFILE_PRIVATE')
    }
    
    // Remove sensitive fields for non-admin, non-self users
    delete user.email
    delete user.role
    delete user.isActive
    delete user.isVerified
    delete user.settings
  }
  
  return user
}
