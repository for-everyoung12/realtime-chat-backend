import { Router } from 'express'
import authRouter from './modules/common/auth/auth.router.js'
import chatRouter from './modules/chat/chat.router.js'
import notifyRouter from './modules/notify/notify.router.js'
import friendRouter from './modules/friend/friend.router.js'
import userRouter from './modules/user/user.router.js'
import adminRouter from './modules/admin/admin.router.js'

export const apiRouter = Router()
apiRouter.use('/auth', authRouter)
apiRouter.use('/chat', chatRouter)
apiRouter.use('/notify', notifyRouter)
apiRouter.use('/friend', friendRouter)
apiRouter.use('/user', userRouter)
apiRouter.use('/admin', adminRouter)