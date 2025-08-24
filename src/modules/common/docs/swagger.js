import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real-time Chat API',
      version: '1.0.0',
      description: 'A real-time chat application API with WebSocket support and role-based access control',
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
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            avatarUrl: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'busy'] },
            role: { type: 'string', enum: ['user', 'moderator', 'admin'] },
            isActive: { type: 'boolean' },
            isVerified: { type: 'boolean' },
            lastOnline: { type: 'string', format: 'date-time' },
            settings: {
              type: 'object',
              properties: {
                notifications: { type: 'boolean' },
                theme: { type: 'string', enum: ['light', 'dark'] },
                allowDirectMessage: { type: 'boolean' },
                privacyLevel: { type: 'string', enum: ['public', 'friends', 'private'] }
              }
            }
          }
        },
        Conversation: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'ObjectId' },
            type: { type: 'string', enum: ['single', 'group'] },
            name: { type: 'string' },
            avatarUrl: { type: 'string' },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'ObjectId' },
                  role: { type: 'string', enum: ['admin', 'member'] },
                  joinedAt: { type: 'string', format: 'date-time' }
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
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
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
            metadata: {
              type: 'object',
              properties: {
                size: { type: 'number' },
                mimeType: { type: 'string' }
              }
            },
            readBy: {
              type: 'array',
              items: { type: 'string', format: 'ObjectId' }
            },
            clientMsgId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'ObjectId' },
            userId: { type: 'string', format: 'ObjectId' },
            type: { type: 'string', enum: ['new_message', 'mention', 'invite_group', 'friend_request'] },
            data: { type: 'object' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Friendship: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'ObjectId' },
            requesterId: { type: 'string', format: 'ObjectId' },
            receiverId: { type: 'string', format: 'ObjectId' },
            status: { type: 'string', enum: ['pending', 'accepted', 'blocked'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints'
      },
      {
        name: 'Chat',
        description: 'Conversation and message management'
      },
      {
        name: 'Users',
        description: 'User profile and management'
      },
      {
        name: 'Friends',
        description: 'Friend request and management'
      },
      {
        name: 'Notifications',
        description: 'User notification management'
      },
      {
        name: 'Admin',
        description: 'Administrative functions (requires admin role)'
      }
    ]
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
