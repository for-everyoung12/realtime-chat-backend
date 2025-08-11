import mongoose from 'mongoose'
import { logger } from '../obs/logger.js'

export function connectMongo () {
  const uri = process.env.MONGO_URI
  mongoose.set('strictQuery', true)
  mongoose.connect(uri, {
    dbName: process.env.MONGO_DB,
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 50),
    minPoolSize: Number(process.env.MONGO_POOL_SIZE || 5),
    serverSelectionTimeoutMS: 8000, // 8 seconds
    socketTimeoutMS: 30000, // 30 seconds
    compressors: ['zstd', 'snappy'].filter(Boolean),
   })


  mongoose.connection.on('connected', () => logger.info('Mongo connected'))
  mongoose.connection.on('error', (e) => logger.error(e, 'Mongo error'))
}