// Friendship statuses
export const FRIENDSHIP_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  BLOCKED: 'blocked'
}

// Friendship actions
export const FRIENDSHIP_ACTIONS = {
  REQUEST: 'request',
  ACCEPT: 'accept',
  REJECT: 'reject',
  BLOCK: 'block',
  UNBLOCK: 'unblock',
  REMOVE: 'remove'
}

// Validation constants
export const VALIDATION_LIMITS = {
  MAX_FRIENDS: 1000,
  MAX_PENDING_REQUESTS: 50,
  MAX_BLOCKED_USERS: 100
}

// Error messages
export const FRIENDSHIP_ERRORS = {
  INVALID_ID: 'INVALID_ID',
  SELF_REQUEST: 'SELF_REQUEST',
  SELF_BLOCK: 'SELF_BLOCK',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  ALREADY_REQUESTED: 'ALREADY_REQUESTED',
  ALREADY_PENDING_REVERSE: 'ALREADY_PENDING_REVERSE',
  REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
  FRIENDSHIP_NOT_FOUND: 'FRIENDSHIP_NOT_FOUND',
  BLOCKED: 'BLOCKED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  MAX_FRIENDS_REACHED: 'MAX_FRIENDS_REACHED',
  MAX_PENDING_REACHED: 'MAX_PENDING_REACHED',
  MAX_BLOCKED_REACHED: 'MAX_BLOCKED_REACHED'
}

// Query options
export const FRIENDSHIP_QUERY_OPTIONS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_SORT: { createdAt: -1 }
}

// Notification types
export const FRIENDSHIP_NOTIFICATIONS = {
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  FRIEND_REJECTED: 'friend_rejected',
  FRIEND_REMOVED: 'friend_removed',
  USER_BLOCKED: 'user_blocked',
  USER_UNBLOCKED: 'user_unblocked'
}
