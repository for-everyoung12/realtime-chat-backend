import { validateObjectId } from '../common/validation.js'
import { FriendRepository } from './friend.repo.js'
import { createNotify } from '../notify/notify.service.js'
import { 
  FRIENDSHIP_STATUS, 
  FRIENDSHIP_ERRORS, 
  VALIDATION_LIMITS,
  FRIENDSHIP_NOTIFICATIONS 
} from './friend.types.js'

// Helper function to check if two IDs are equal
const isEqual = (a, b) => String(a) === String(b)

// Helper function to throw validation errors
const throwError = (message, status = 400) => {
  const error = new Error(message)
  error.status = status
  throw error
}

export async function requestFriend({ requesterId, receiverId }) {
  // Validation
  if (!validateObjectId(requesterId) || !validateObjectId(receiverId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }
  
  if (isEqual(requesterId, receiverId)) {
    throwError(FRIENDSHIP_ERRORS.SELF_REQUEST, 400)
  }

  // Check existing friendship
  const existing = await FriendRepository.findFriendship(requesterId, receiverId)
  
  if (existing) {
    if (existing.status === FRIENDSHIP_STATUS.BLOCKED) {
      throwError(FRIENDSHIP_ERRORS.BLOCKED, 409)
    }
    if (existing.status === FRIENDSHIP_STATUS.ACCEPTED) {
      throwError(FRIENDSHIP_ERRORS.ALREADY_FRIENDS, 409)
    }
    if (existing.status === FRIENDSHIP_STATUS.PENDING) {
      if (isEqual(existing.requesterId, requesterId)) {
        throwError(FRIENDSHIP_ERRORS.ALREADY_REQUESTED, 409)
      }
      throwError(FRIENDSHIP_ERRORS.ALREADY_PENDING_REVERSE, 409)
    }
  }

  // Check limits
  const pendingCount = await FriendRepository.findPendingRequests(requesterId, { limit: 1 })
  if (pendingCount.length >= VALIDATION_LIMITS.MAX_PENDING_REQUESTS) {
    throwError(FRIENDSHIP_ERRORS.MAX_PENDING_REACHED, 429)
  }

  // Create friendship request
  const friendship = await FriendRepository.create({ 
    requesterId, 
    receiverId, 
    status: FRIENDSHIP_STATUS.PENDING 
  })

  // Send notification
  await createNotify({
    userId: receiverId,
    type: FRIENDSHIP_NOTIFICATIONS.FRIEND_REQUEST,
    data: { requesterId, friendshipId: friendship._id }
  })

  return friendship
}

export async function acceptFriend({ requesterId, receiverId }) {
  // Validation
  if (!validateObjectId(requesterId) || !validateObjectId(receiverId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  // Check limits
  const friendsCount = await FriendRepository.findFriendshipsByUser(receiverId, FRIENDSHIP_STATUS.ACCEPTED, { limit: 1 })
  if (friendsCount.length >= VALIDATION_LIMITS.MAX_FRIENDS) {
    throwError(FRIENDSHIP_ERRORS.MAX_FRIENDS_REACHED, 429)
  }

  // Update friendship status
  const updated = await FriendRepository.updateStatus(
    requesterId, 
    receiverId, 
    FRIENDSHIP_STATUS.ACCEPTED
  )

  if (!updated) {
    throwError(FRIENDSHIP_ERRORS.REQUEST_NOT_FOUND, 404)
  }

  // Send notification
  await createNotify({
    userId: requesterId,
    type: FRIENDSHIP_NOTIFICATIONS.FRIEND_ACCEPTED,
    data: { receiverId, friendshipId: updated._id }
  })

  return updated
}

export async function rejectFriend({ requesterId, receiverId }) {
  // Validation
  if (!validateObjectId(requesterId) || !validateObjectId(receiverId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  // Update friendship status
  const updated = await FriendRepository.updateStatus(
    requesterId, 
    receiverId, 
    FRIENDSHIP_STATUS.REJECTED
  )

  if (!updated) {
    throwError(FRIENDSHIP_ERRORS.REQUEST_NOT_FOUND, 404)
  }

  // Send notification
  await createNotify({
    userId: requesterId,
    type: FRIENDSHIP_NOTIFICATIONS.FRIEND_REJECTED,
    data: { receiverId, friendshipId: updated._id }
  })

  return updated
}

export async function blockUser({ userId, otherId }) {
  // Validation
  if (!validateObjectId(userId) || !validateObjectId(otherId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }
  
  if (isEqual(userId, otherId)) {
    throwError(FRIENDSHIP_ERRORS.SELF_BLOCK, 400)
  }

  // Check limits
  const blockedCount = await FriendRepository.findFriendshipsByUser(userId, FRIENDSHIP_STATUS.BLOCKED, { limit: 1 })
  if (blockedCount.length >= VALIDATION_LIMITS.MAX_BLOCKED_USERS) {
    throwError(FRIENDSHIP_ERRORS.MAX_BLOCKED_REACHED, 429)
  }

  // Delete existing friendships
  await FriendRepository.deleteFriendship(userId, otherId)

  // Create blocked relationship
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
  // Validation
  if (!validateObjectId(userId) || !validateObjectId(otherId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  // Check if user is blocked by the current user
  const isBlocked = await FriendRepository.isBlocked(userId, otherId)
  if (!isBlocked) {
    throwError(FRIENDSHIP_ERRORS.FRIENDSHIP_NOT_FOUND, 404)
  }

  // Delete the blocked relationship
  await FriendRepository.deleteFriendship(userId, otherId)

  return { success: true }
}

export async function removeFriend({ userId, otherId }) {
  // Validation
  if (!validateObjectId(userId) || !validateObjectId(otherId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  // Check if they are friends
  const areFriends = await FriendRepository.areFriends(userId, otherId)
  if (!areFriends) {
    throwError(FRIENDSHIP_ERRORS.FRIENDSHIP_NOT_FOUND, 404)
  }

  // Delete the friendship
  await FriendRepository.deleteFriendship(userId, otherId)

  // Send notification
  await createNotify({
    userId: otherId,
    type: FRIENDSHIP_NOTIFICATIONS.FRIEND_REMOVED,
    data: { removedBy: userId }
  })

  return { success: true }
}

export async function listFriends({ userId, status = FRIENDSHIP_STATUS.ACCEPTED, cursor, limit = 20 }) {
  // Validation
  if (!validateObjectId(userId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  const friendships = await FriendRepository.findFriendshipsByUser(userId, status, {
    limit: Math.min(limit, VALIDATION_LIMITS.MAX_LIMIT),
    cursor,
    populate: true
  })

  const nextCursor = friendships.length ? friendships[friendships.length - 1].createdAt.toISOString() : null

  return { 
    friendships, 
    nextCursor,
    total: friendships.length
  }
}

export async function listPendingRequests({ userId, cursor, limit = 20 }) {
  // Validation
  if (!validateObjectId(userId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  const requests = await FriendRepository.findPendingRequests(userId, {
    limit: Math.min(limit, VALIDATION_LIMITS.MAX_LIMIT),
    cursor,
    populate: true
  })

  const nextCursor = requests.length ? requests[requests.length - 1].createdAt.toISOString() : null

  return { 
    requests, 
    nextCursor,
    total: requests.length
  }
}

export async function getFriendshipStats({ userId }) {
  // Validation
  if (!validateObjectId(userId)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  const stats = await FriendRepository.getStats(userId)
  
  return {
    total: Object.values(stats).reduce((sum, count) => sum + count, 0),
    ...stats
  }
}

export async function checkFriendshipStatus({ userId1, userId2 }) {
  // Validation
  if (!validateObjectId(userId1) || !validateObjectId(userId2)) {
    throwError(FRIENDSHIP_ERRORS.INVALID_ID, 400)
  }

  const friendship = await FriendRepository.findFriendship(userId1, userId2)
  
  if (!friendship) {
    return { status: 'none' }
  }

  return {
    status: friendship.status,
    isBlocked: friendship.status === FRIENDSHIP_STATUS.BLOCKED,
    blockedBy: friendship.blockedBy,
    blockedAt: friendship.blockedAt
  }
}
