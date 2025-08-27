import mongoose from 'mongoose'
import { validateObjectId } from '../common/validation.js'
import { FriendRepository } from './friend.repo.js'
import { createNotify } from '../notify/notify.service.js'
import {
  FRIENDSHIP_STATUS,
  FRIENDSHIP_ERRORS,
  VALIDATION_LIMITS,
  FRIENDSHIP_NOTIFICATIONS
} from './friend.types.js'

// utils
const isEqual = (a, b) => String(a) === String(b)
const throwError = (message, status = 400) => { const e = new Error(message); e.status = status; throw e }

// Cursor helpers (keyset with updatedAt + _id)
const encodeCursor = (doc) =>
  Buffer.from(JSON.stringify({ t: (doc.updatedAt ?? doc.createdAt).toISOString(), id: String(doc._id) }), 'utf8').toString('base64')

const decodeCursor = (s) => {
  if (!s) return null
  try {
    const { t, id } = JSON.parse(Buffer.from(s, 'base64').toString('utf8'))
    return { t: new Date(t), id }
  } catch { return null }
}

const buildCursorCond = (cursor) => {
  if (!cursor) return null
  const t = new Date(cursor.t)
  if (isNaN(t)) return null
  return {
    $or: [
      { updatedAt: { $lt: t } },
      { updatedAt: t, _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } }
    ]
  }
}

// ---- Commands

export async function requestFriend({ requesterId, receiverId }) {
  if (!validateObjectId(requesterId) || !validateObjectId(receiverId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }
  if (isEqual(requesterId, receiverId)) throwError(FRIENDSHIP_ERRORS.SELF_REQUEST, 400)

  const existing = await FriendRepository.findFriendship(requesterId, receiverId)
  if (existing) {
    if (existing.status === FRIENDSHIP_STATUS.BLOCKED) throwError(FRIENDSHIP_ERRORS.BLOCKED, 409)
    if (existing.status === FRIENDSHIP_STATUS.ACCEPTED) throwError(FRIENDSHIP_ERRORS.ALREADY_FRIENDS, 409)
    if (existing.status === FRIENDSHIP_STATUS.PENDING) {
      if (isEqual(existing.requesterId, requesterId)) throwError(FRIENDSHIP_ERRORS.ALREADY_REQUESTED, 409)
      throwError(FRIENDSHIP_ERRORS.ALREADY_PENDING_REVERSE, 409)
    }
  }

  const pendingCount = await FriendRepository.findPendingRequests(requesterId, { limit: 1 })
  if (pendingCount.length >= VALIDATION_LIMITS.MAX_PENDING_REQUESTS) {
    throwError(FRIENDSHIP_ERRORS.MAX_PENDING_REACHED, 429)
  }

  const friendship = await FriendRepository.create({
    requesterId, receiverId, status: FRIENDSHIP_STATUS.PENDING
  })

  await createNotify({
    userId: receiverId,
    type: FRIENDSHIP_NOTIFICATIONS.FRIEND_REQUEST,
    data: { requesterId, friendshipId: friendship._id }
  })

  return friendship
}

export async function acceptFriend({ requesterId, receiverId }) {
  if (!validateObjectId(requesterId) || !validateObjectId(receiverId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  const friendsCount = await FriendRepository.findFriendshipsByUser(
    receiverId, FRIENDSHIP_STATUS.ACCEPTED, { limit: 1 }
  )
  if (friendsCount.length >= VALIDATION_LIMITS.MAX_FRIENDS) {
    throwError(FRIENDSHIP_ERRORS.MAX_FRIENDS_REACHED, 429)
  }

  const updated = await FriendRepository.updateStatus(
    requesterId, receiverId, FRIENDSHIP_STATUS.ACCEPTED
  )
  if (!updated) throwError(FRIENDSHIP_ERRORS.REQUEST_NOT_FOUND, 404)

  await createNotify({
    userId: requesterId,
    type: FRIENDSHIP_NOTIFICATIONS.FRIEND_ACCEPTED,
    data: { receiverId, friendshipId: updated._id }
  })

  return updated
}

export async function rejectFriend({ requesterId, receiverId }) {
  if (!validateObjectId(requesterId) || !validateObjectId(receiverId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  const updated = await FriendRepository.updateStatus(
    requesterId, receiverId, FRIENDSHIP_STATUS.REJECTED
  )
  if (!updated) throwError(FRIENDSHIP_ERRORS.REQUEST_NOT_FOUND, 404)

  await createNotify({
    userId: requesterId,
    type: FRIENDSHIP_NOTIFICATIONS.FRIEND_REJECTED,
    data: { receiverId, friendshipId: updated._id }
  })

  return updated
}

export async function blockUser({ userId, otherId }) {
  if (!validateObjectId(userId) || !validateObjectId(otherId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }
  if (isEqual(userId, otherId)) throwError(FRIENDSHIP_ERRORS.SELF_BLOCK, 400)

  const blockedCount = await FriendRepository.findFriendshipsByUser(
    userId, FRIENDSHIP_STATUS.BLOCKED, { limit: 1 }
  )
  if (blockedCount.length >= VALIDATION_LIMITS.MAX_BLOCKED_USERS) {
    throwError(FRIENDSHIP_ERRORS.MAX_BLOCKED_REACHED, 429)
  }

  await FriendRepository.deleteFriendship(userId, otherId)

  const blocked = await FriendRepository.create({
    requesterId: userId,
    receiverId: otherId,
    status: FRIENDSHIP_STATUS.BLOCKED,
    blockedBy: userId,
    blockedAt: new Date()
  })
  return blocked
}

export async function unblockUser({ userId, otherId }) {
  if (!validateObjectId(userId) || !validateObjectId(otherId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }
  const isBlocked = await FriendRepository.isBlocked(userId, otherId)
  if (!isBlocked) throwError(FRIENDSHIP_ERRORS.FRIENDSHIP_NOT_FOUND, 404)

  await FriendRepository.deleteFriendship(userId, otherId)
  return { success: true }
}

export async function removeFriend({ userId, otherId }) {
  if (!validateObjectId(userId) || !validateObjectId(otherId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }
  const areFriends = await FriendRepository.areFriends(userId, otherId)
  if (!areFriends) throwError(FRIENDSHIP_ERRORS.FRIENDSHIP_NOT_FOUND, 404)

  await FriendRepository.deleteFriendship(userId, otherId)
  await createNotify({
    userId: otherId,
    type: FRIENDSHIP_NOTIFICATIONS.FRIEND_REMOVED,
    data: { removedBy: userId }
  })
  return { success: true }
}

// ---- Queries

export async function listFriends({
  userId, status = FRIENDSHIP_STATUS.ACCEPTED, cursor, limit = 20, search, online
}) {
  if (!validateObjectId(userId)) throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)

  const pageSize = Math.min(limit, VALIDATION_LIMITS.MAX_LIMIT)
  const cur = decodeCursor(cursor)
  const cursorCond = buildCursorCond(cur)

  // fetch +1 to detect hasMore
  const rows = await FriendRepository.findFriendshipsByUser(userId, status, {
    limit: pageSize + 1,
    cursorCond,
    populate: true
  })

  // post-filter (nếu muốn chuyển sang aggregate thì có thể refactor sang repo)
  const filtered = rows.filter(r => {
    const me = String(userId)
    const peer = String(r.requesterId?._id) === me ? r.receiverId : r.requesterId
    const okSearch = !search
      || new RegExp(search, 'i').test(peer?.name || '')
      || new RegExp(search, 'i').test(peer?.email || '')
    const okOnline = online ? (peer?.status === 'online') : true
    return okSearch && okOnline
  })

  const hasMore = filtered.length > pageSize
  const data = hasMore ? filtered.slice(0, pageSize) : filtered

  const items = data.map(doc => {
    const me = String(userId)
    const peer = String(doc.requesterId?._id) === me ? doc.receiverId : doc.requesterId
    return {
      friendshipId: doc._id,
      friendId: peer?._id,
      name: peer?.name,
      email: peer?.email,
      avatar: peer?.avatarUrl,
      presence: peer?.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }
  })

  const last = data[data.length - 1]
  const nextCursor = hasMore && last ? encodeCursor(last) : null

  return { items, nextCursor, hasMore, pageSize }
}

export async function listPendingRequests({ userId, cursor, limit = 20 }) {
  if (!validateObjectId(userId)) throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)

  const pageSize = Math.min(limit, VALIDATION_LIMITS.MAX_LIMIT)
  const cur = decodeCursor(cursor)
  const cursorCond = buildCursorCond(cur)

  const rows = await FriendRepository.findPendingRequests(userId, {
    limit: pageSize + 1,
    cursorCond,
    populate: true
  })

  const hasMore = rows.length > pageSize
  const data = hasMore ? rows.slice(0, pageSize) : rows
  const nextCursor = hasMore ? encodeCursor(data[data.length - 1]) : null

  return { items: data, nextCursor, hasMore, pageSize }
}

export async function getFriendshipStats({ userId }) {
  if (!validateObjectId(userId)) throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  const stats = await FriendRepository.getStats(userId)
  return {
    total: Object.values(stats).reduce((sum, count) => sum + count, 0),
    stats
  }
}

export async function checkFriendshipStatus({ userId1, userId2 }) {
  if (!validateObjectId(userId1) || !validateObjectId(userId2)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }
  const friendship = await FriendRepository.findFriendship(userId1, userId2)
  if (!friendship) return { status: 'none' }
  return {
    status: friendship.status,
    isBlocked: friendship.status === FRIENDSHIP_STATUS.BLOCKED,
    blockedBy: friendship.blockedBy,
    blockedAt: friendship.blockedAt
  }
}
