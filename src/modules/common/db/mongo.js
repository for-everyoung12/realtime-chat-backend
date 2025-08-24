import mongoose from 'mongoose'
import { logger } from '../obs/logger.js'

export function connectMongo() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('MONGO_URI environment variable is required')
  }

  mongoose.set('strictQuery', true)
  
  const options = {
    dbName: process.env.MONGO_DB,
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 50),
    minPoolSize: Number(process.env.MONGO_POOL_SIZE || 5),
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
    // Enable compression if available
    compressors: ['zstd', 'snappy'].filter(Boolean),
  }

  mongoose.connect(uri, options)

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected successfully')
  })

  mongoose.connection.on('error', (e) => {
    logger.error(e, 'MongoDB connection error')
  })

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected')
  })

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected')
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close()
      logger.info('MongoDB connection closed through app termination')
      process.exit(0)
    } catch (err) {
      logger.error(err, 'Error during MongoDB shutdown')
      process.exit(1)
    }
  })
}