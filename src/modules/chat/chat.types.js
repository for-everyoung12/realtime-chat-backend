/**
 * @typedef {'text'|'image'|'file'|'system'} MessageType
 *
 * @typedef {Object} MessageDTO
 * @property {string} conversationId
 * @property {string} senderId
 * @property {MessageType} type
 * @property {string=} content
 * @property {string=} fileUrl
 *
 * @typedef {Object} PaginationResult<T>
 * @property {T[]} rows
 * @property {string|null} nextCursor
 */
export {}
