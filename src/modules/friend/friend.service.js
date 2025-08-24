import mongoose from 'mongoose'
import { Friendship } from './friend.repo.js'
import { createNotify } from '../notify/notify.service.js'

const isOID = mongoose.isValidObjectId
const eq = (a, b) => String(a) === String(b)

export async function requestFriend ({ requesterId, receiverId }) {
  if (!isOID(requesterId) || !isOID(receiverId)) bad('INVALID_ID', 400)
  if (eq(requesterId, receiverId)) bad('SELF_REQUEST', 400)

  const exist = await Friendship.findOne({
    $or: [
      { requesterId, receiverId },
      { requesterId: receiverId, receiverId: requesterId }
    ]
  }).lean()

  if (exist) {
    if (exist.status === 'blocked') bad('BLOCKED', 409)
    if (exist.status === 'accepted') bad('ALREADY_FRIENDS', 409)
    if (exist.status === 'pending') {
      if (eq(exist.requesterId, requesterId)) bad('ALREADY_REQUESTED', 409)
      bad('ALREADY_PENDING_REVERSE', 409)
    }
  }

  const doc = await Friendship.create({ requesterId, receiverId, status: 'pending' })

  // notify người nhận
  await createNotify({
    userId: receiverId,
    type: 'friend_request',
    data: { requesterId }
  })

  return doc
}

export async function acceptFriend ({ requesterId, receiverId }) {
  if (!isOID(requesterId) || !isOID(receiverId)) bad('INVALID_ID', 400)

  const updated = await Friendship.findOneAndUpdate(
    { requesterId, receiverId, status: 'pending' },
    { $set: { status: 'accepted' } },
    { new: true }
  )

  if (!updated) bad('REQUEST_NOT_FOUND', 404)

  await createNotify({
    userId: requesterId,
    type: 'friend_request',
    data: { receiverId, status: 'accepted' }
  })

  return updated
}
export async function blockUser ({ userId, otherId }) {
  if (!isOID(userId) || !isOID(otherId)) bad('INVALID_ID', 400)
  if (eq(userId, otherId)) bad('SELF_BLOCK', 400)

  await Friendship.deleteMany({
    $or: [
      { requesterId: userId, receiverId: otherId },
      { requesterId: otherId, receiverId: userId }
    ]
  })

  const doc = await Friendship.findOneAndUpdate(
    { requesterId: userId, receiverId: otherId },
    { $set: { status: 'blocked' } },
    { upsert: true, new: true }
  )

  return doc
}

function bad (msg, status) { const e = new Error(msg); e.status = status; throw e }
