import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real-time Chat API',
      version: '1.0.0',
      description: 'A real-time chat application API with WebSocket support',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:8080',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: process.env.COOKIE_NAME || 'chat_token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'ObjectId' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            status: { type: 'string', enum: ['online', 'offline'] },
            lastOnline: { type: 'string', format: 'date-time' }
          }
        },
        Conversation: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'ObjectId' },
            type: { type: 'string', enum: ['single', 'group'] },
            name: { type: 'string' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'ObjectId' },
                  role: { type: 'string', enum: ['admin', 'member'] }
                }
              }
            },
            lastMessage: {
              type: 'object',
              properties: {
                messageId: { type: 'string', format: 'ObjectId' },
                senderId: { type: 'string', format: 'ObjectId' },
                content: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'ObjectId' },
            conversationId: { type: 'string', format: 'ObjectId' },
            senderId: { type: 'string', format: 'ObjectId' },
            type: { type: 'string', enum: ['text', 'image', 'file', 'system'] },
            content: { type: 'string' },
            fileUrl: { type: 'string' },
            readBy: {
              type: 'array',
              items: { type: 'string', format: 'ObjectId' }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: [
    './src/modules/**/*.router.js',
    './src/modules/**/*.controller.js'
  ]
}

export const specs = swaggerJsdoc(options)
export const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Real-time Chat API Documentation'
}
