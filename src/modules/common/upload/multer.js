import multer from 'multer'

const storage = multer.memoryStorage()

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = Number(process.env.MAX_AVATAR_MB || 2) * 1024 * 1024 // bytes

export const avatarUpload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error('UNSUPPORTED_MIME'))
    }
    cb(null, true)
  }
})
