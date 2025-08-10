import bcrypt from 'bcryptjs'
import { User } from '../db/user.model.js'
import { signToken, setAuthCookie, clearAuthCookie } from './auth.js'

export async function register({ name, email, password }) {
  const exists = await User.findOne({ email })
  if (exists) throw Object.assign(new Error('EMAIL_EXISTS'), { status: 409 })
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash })
  return user
}

export async function login({ email, password }, res) {
  const user = await User.findOne({ email })
  if (!user) throw Object.assign(new Error('INVALID_CREDENTIALS'), { status: 401 })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw Object.assign(new Error('INVALID_CREDENTIALS'), { status: 401 })
  const token = signToken({ id: user._id, email: user.email })
  setAuthCookie(res, token)
  return user
}

export async function logout(res) {
  clearAuthCookie(res)
}