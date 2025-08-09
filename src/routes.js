import { Router } from 'express'
import chatRouter from './modules/chat/chat.router.js'
import notifyRouter from './modules/notify/notify.router.js'
import friendRouter from './modules/friend/friend.router.js'

export const apiRouter = Router()
apiRouter.use('/chat', chatRouter)
apiRouter.use('/notify', notifyRouter)
apiRouter.use('/friend', friendRouter)