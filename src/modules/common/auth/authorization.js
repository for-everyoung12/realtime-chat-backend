import { User } from '../db/user.model.js'
import { ValidationError } from '../validation.js'

// Role hierarchy
const ROLE_HIERARCHY = {
  user: 1,
  moderator: 2,
  admin: 3
}

// Permission definitions
const PERMISSIONS = {
  // User management
  'manage_users': ['admin', 'moderator'],
  'view_users': ['admin', 'moderator'],
  'delete_users': ['admin'],
  'ban_users': ['admin', 'moderator'],
  
  // Conversation management
  'manage_conversations': ['admin', 'moderator'],
  'delete_conversations': ['admin'],
  'view_all_conversations': ['admin', 'moderator'],
  
  // Message moderation
  'moderate_messages': ['admin', 'moderator'],
  'delete_messages': ['admin', 'moderator'],
  'view_deleted_messages': ['admin'],
  
  // System management
  'view_analytics': ['admin', 'moderator'],
  'manage_system': ['admin'],
  'view_logs': ['admin'],
  
  // Content management
  'manage_content': ['admin', 'moderator'],
  'approve_content': ['admin', 'moderator']
}

// Check if user has required role
export function hasRole(userRole, requiredRole) {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Check if user has specific permission
export function hasPermission(userRole, userPermissions = [], permission) {
  // Check role-based permission
  const allowedRoles = PERMISSIONS[permission] || []
  if (allowedRoles.includes(userRole)) return true
  
  // Check explicit permissions
  return userPermissions.includes(permission)
}

// Middleware to require specific role
export function requireRole(role) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'UNAUTHORIZED' })
      }
      
      // Get fresh user data with permissions
      const user = await User.findById(req.user.id).select('role permissions isActive')
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'USER_INACTIVE' })
      }
      
      if (!hasRole(user.role, role)) {
        return res.status(403).json({ error: 'INSUFFICIENT_ROLE' })
      }
      
      // Attach user data to request
      req.userRole = user.role
      req.userPermissions = user.permissions
      next()
    } catch (error) {
      next(error)
    }
  }
}

// Middleware to require specific permission
export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'UNAUTHORIZED' })
      }
      
      // Get fresh user data with permissions
      const user = await User.findById(req.user.id).select('role permissions isActive')
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'USER_INACTIVE' })
      }
      
      if (!hasPermission(user.role, user.permissions, permission)) {
        return res.status(403).json({ error: 'INSUFFICIENT_PERMISSION' })
      }
      
      // Attach user data to request
      req.userRole = user.role
      req.userPermissions = user.permissions
      next()
    } catch (error) {
      next(error)
    }
  }
}

// Middleware to require admin role
export const requireAdmin = requireRole('admin')

// Middleware to require moderator or admin
export const requireModerator = requireRole('moderator')

// Utility function to check conversation admin
export function isConversationAdmin(conversation, userId) {
  const member = conversation.members.find(m => String(m.userId) === String(userId))
  return member && member.role === 'admin'
}

// Utility function to check conversation member
export function isConversationMember(conversation, userId) {
  return conversation.members.some(m => String(m.userId) === String(userId))
}

// Admin-only operations
export const ADMIN_OPERATIONS = {
  // User management
  'user.delete': requirePermission('delete_users'),
  'user.ban': requirePermission('ban_users'),
  'user.role.update': requireAdmin,
  
  // System management
  'system.config': requirePermission('manage_system'),
  'system.analytics': requirePermission('view_analytics'),
  'system.logs': requirePermission('view_logs'),
  
  // Content moderation
  'message.delete.global': requirePermission('delete_messages'),
  'conversation.delete': requirePermission('delete_conversations')
}

// Moderator operations
export const MODERATOR_OPERATIONS = {
  'user.view': requirePermission('view_users'),
  'conversation.view': requirePermission('view_all_conversations'),
  'message.moderate': requirePermission('moderate_messages'),
  'content.approve': requirePermission('approve_content')
}
