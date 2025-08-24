import { Router } from 'express'
import userController from './user.controller.js'

const router = Router()

// User profile routes
router.post('/avatar', userController.uploadAvatar)
router.get('/profile/:id', userController.getProfile)
router.put('/profile', userController.updateProfile)

// Admin routes
router.get('/admin/users', userController.listUsers)
router.get('/admin/stats', userController.getStats)
router.put('/admin/:id/role', userController.updateUserRole)
router.post('/admin/:id/ban', userController.banUser)
router.post('/admin/:id/unban', userController.unbanUser)

export default router
