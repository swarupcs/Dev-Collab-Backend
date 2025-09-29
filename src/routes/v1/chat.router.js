import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import {
  createChat,
  deleteChat,
  getChatById,
  getConversationMessages,
  getUnreadCount,
  getUserChats,
  searchMessages,
} from '../../controllers/chat.controller.js';

const chatRouter = express.Router();

chatRouter.use(authMiddleware);

// ==================== CHAT ROUTES ====================
// These are for fetching data, not real-time operations

/**
 * GET /api/chats/getUserChats
 * Get all user's chats with last message and unread count
 */
chatRouter.get('/getUserChats', getUserChats);

/**
 * POST /api/chats/createChat
 * Create or find existing chat between two users
 * Body: { userId: string }
 */
chatRouter.post('/createChat', createChat);

/**
 * GET /api/chats/getChatById/:chatId
 * Get specific chat by ID with participants
 */
chatRouter.get('/getChatById/:chatId', getChatById);

/**
 * DELETE /api/chats/deleteChat/:chatId
 * Archive/delete a chat
 */
chatRouter.delete('/deleteChat/:chatId', deleteChat);

// ==================== MESSAGE ROUTES (READ-ONLY) ====================
// For fetching historical data - all real-time ops go through Socket.IO

/**
 * GET /api/chats/getConversationMessages/:userId
 * Get paginated message history for a conversation
 * Query params: page, limit
 */
chatRouter.get('/getConversationMessages/:userId', getConversationMessages);

/**
 * GET /api/chats/getUnreadCount
 * Get total unread message count for current user
 */
chatRouter.get('/getUnreadCount', getUnreadCount);
/**
 * GET /api/chats/searchMessages/:userId
 * Search messages in a specific conversation
 * Query params: query, page, limit
 */
chatRouter.get('/searchMessages/:userId', searchMessages);

// ==================== REMOVED ROUTES ====================
// These operations now happen through Socket.IO only:
// - POST /sendMessage (use socket.emit('sendMessage'))
// - PUT /markMessagesAsRead (use socket.emit('markAsRead'))
// - PUT /editMessage/:messageId (use socket.emit('editMessage'))
// - DELETE /deleteMessage/:messageId (use socket.emit('deleteMessage'))


export default chatRouter;
