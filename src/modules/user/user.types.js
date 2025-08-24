// User roles
export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
}

// User status
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy'
}

// Privacy levels
export const PRIVACY_LEVELS = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private'
}

// Theme options
export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark'
}

// User permissions
export const USER_PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_CONVERSATIONS: 'manage_conversations',
  VIEW_ANALYTICS: 'view_analytics',
  MODERATE_MESSAGES: 'moderate_messages',
  MANAGE_SYSTEM: 'manage_system'
}

// Validation constants
export const VALIDATION_LIMITS = {
  MAX_NAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 100,
  MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_AVATAR_TYPES: ['image/jpeg', 'image/png', 'image/gif']
}

// Default user settings
export const DEFAULT_USER_SETTINGS = {
  notifications: true,
  theme: THEME_OPTIONS.LIGHT,
  allowDirectMessage: true,
  privacyLevel: PRIVACY_LEVELS.FRIENDS
}

// User query filters
export const USER_FILTERS = {
  ROLE: 'role',
  STATUS: 'status',
  IS_ACTIVE: 'isActive',
  IS_VERIFIED: 'isVerified',
  SEARCH: 'search'
}

// Sort options
export const USER_SORT_OPTIONS = {
  CREATED_AT_ASC: { createdAt: 1 },
  CREATED_AT_DESC: { createdAt: -1 },
  NAME_ASC: { name: 1 },
  NAME_DESC: { name: -1 },
  LAST_ONLINE_DESC: { lastOnline: -1 }
}
