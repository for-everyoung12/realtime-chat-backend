import mongoose from 'mongoose'
import { logger } from '../obs/logger.js'

export function connectMongo () {
  const uri = process.env.MONGO_URI
  mongoose.set('strictQuery', true)
  mongoose.connect(uri, { dbName: process.env.MONGO_DB })
  mongoose.connection.on('connected', () => logger.info('Mongo connected'))
  mongoose.connection.on('error', (e) => logger.error(e, 'Mongo error'))
}