import mongoose from 'mongoose'
import { redis } from '../cache/redis.js'
import { User } from '../db/user.model.js'
import { Conversation, Message } from '../../chat/chat.repo.js'
import { Notification } from '../../notify/notify.repo.js'

// Test database utilities
export class TestDatabase {
  static async connect() {
    const testUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/test'
    await mongoose.connect(testUri, {
      dbName: 'test_chat_db'
    })
  }

  static async disconnect() {
    await mongoose.connection.close()
  }

  static async clear() {
    const collections = mongoose.connection.collections
    for (const key in collections) {
      await collections[key].deleteMany({})
    }
  }

  static async clearRedis() {
    await redis.flushdb()
  }
}

// Test data factories
export const createTestUser = async (userData = {}) => {
  const defaultData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    status: 'online'
  }
  
  return await User.create({ ...defaultData, ...userData })
}

export const createTestConversation = async (conversationData = {}) => {
  const defaultData = {
    type: 'single',
    members: []
  }
  
  return await Conversation.create({ ...defaultData, ...conversationData })
}

export const createTestMessage = async (messageData = {}) => {
  const defaultData = {
    type: 'text',
    content: 'Test message',
    senderId: new mongoose.Types.ObjectId(),
    conversationId: new mongoose.Types.ObjectId()
  }
  
  return await Message.create({ ...defaultData, ...messageData })
}

// Socket.IO test utilities
export const createTestSocket = (userId, namespace = '/chat') => {
  const mockSocket = {
    id: `socket_${Date.now()}`,
    data: { userId: String(userId) },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    request: {
      headers: {
        cookie: `chat_token=mock_token_${userId}`
      }
    }
  }
  
  return mockSocket
}

// HTTP test utilities
export const createTestRequest = (userData = null) => {
  const req = {
    user: userData,
    cookies: userData ? { chat_token: `mock_token_${userData.id}` } : {},
    headers: {},
    body: {},
    query: {},
    params: {}
  }
  
  return req
}

export const createTestResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis()
  }
  
  return res
}

// Async test helpers
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const retry = async (fn, maxAttempts = 3, delay = 100) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxAttempts - 1) throw error
      await waitFor(delay)
    }
  }
}
