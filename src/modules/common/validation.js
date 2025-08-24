import mongoose from 'mongoose'

// Centralized validation utilities
export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'ValidationError'
    this.status = status
  }
}

export function validateObjectId(id, fieldName = 'id') {
  if (!mongoose.isValidObjectId(id)) {
    throw new ValidationError(`INVALID_${fieldName.toUpperCase()}`)
  }
  return new mongoose.Types.ObjectId(id)
}

export function validateRequired(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName.toUpperCase()}_REQUIRED`)
  }
  return value
}

export function validateString(value, fieldName, maxLength = 1000) {
  const str = validateRequired(value, fieldName)
  if (typeof str !== 'string') {
    throw new ValidationError(`${fieldName.toUpperCase()}_MUST_BE_STRING`)
  }
  if (str.length > maxLength) {
    throw new ValidationError(`${fieldName.toUpperCase()}_TOO_LONG`)
  }
  return str
}

export function validateEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(`${fieldName.toUpperCase()}_INVALID_VALUE`)
  }
  return value
}

export function validateArray(value, fieldName, minLength = 0) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName.toUpperCase()}_MUST_BE_ARRAY`)
  }
  if (value.length < minLength) {
    throw new ValidationError(`${fieldName.toUpperCase()}_MIN_LENGTH_${minLength}`)
  }
  return value
}

// Global error handler middleware
export function errorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(err.status).json({ error: err.message })
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: err.message })
  }
  
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({ error: 'DUPLICATE_ENTRY' })
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', err)
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' })
}
