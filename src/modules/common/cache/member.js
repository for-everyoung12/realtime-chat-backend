import mongoose from 'mongoose'
import { redis } from './redis.js'
import { Conversation } from '../../chat/chat.repo.js'

const TTL = 60 // giây

export async function getMembersOfConversation (conversationId) {
  const key = `conv:${conversationId}:members`
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const conv = await Conversation.findById(conversationId, { 'members.userId': 1 })
  const list = conv ? conv.members.map(m => String(m.userId)) : []
  await redis.set(key, JSON.stringify(list), 'EX', TTL)
  return list
}

export async function isMember (conversationId, userId) {
  if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(userId)) return false
  const members = await getMembersOfConversation(conversationId)
  return members.includes(String(userId))
}

export async function invalidateMembersCache (conversationId){
  await redis.del(`conv:${conversationId}:members`)
}