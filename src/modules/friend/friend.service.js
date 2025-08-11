import mongoose from 'mongoose'
import { Friendship } from './friend.repo.js'

const isOID = mongoose.isValidObjectId

export async function requestFriend ({ requesterId, receiverId }) {
  if (!isOID(requesterId) || !isOID(receiverId)) bad('INVALID_ID', 400)
  if (String(requesterId) === String(receiverId)) bad('SELF_REQUEST', 400)
  try {
    const doc = await Friendship.create({ requesterId, receiverId, status: 'pending' })
    return doc
  } catch (e) {
    if (e?.code === 11000) bad('ALREADY_REQUESTED', 409)
    throw e
  }
}

export async function acceptFriend ({ requesterId, receiverId }) {
  const updated = await Friendship.findOneAndUpdate(
    { requesterId, receiverId, status: 'pending' },
    { $set: { status: 'accepted' } },
    { new: true }
  )
  if (!updated) bad('REQUEST_NOT_FOUND', 404)
  return updated
}

export async function blockUser ({ userId, otherId }) {
  // block = luôn lưu theo (requester=userId, receiver=otherId)
  const doc = await Friendship.findOneAndUpdate(
    { requesterId: userId, receiverId: otherId },
    { $set: { status: 'blocked' } },
    { upsert: true, new: true }
  )
  return doc
}

function bad (msg, status) { const e = new Error(msg); e.status = status; throw e }
