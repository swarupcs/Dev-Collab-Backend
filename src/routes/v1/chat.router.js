import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import {
  createChat,
  deleteChat,
  deleteMessage,
  editMessage,
  getChatById,
  getConversationMessages,
  getUnreadCount,
  getUserChats,
  markMessagesAsRead,
  searchMessages,
  sendMessage,
} from '../../controllers/chat.controller.js';

const chatRouter = express.Router();

chatRouter.use(authMiddleware);

// ==================== CHAT ROUTES ====================

// Get all user's chats
chatRouter.get('/getUserChats', getUserChats);

// Create or get chat between two users
chatRouter.post('/createChat', createChat);

// Get specific chat by ID
chatRouter.get('/getChatById/:chatId', getChatById);

// Delete/Archive a chat
chatRouter.delete('/deleteChat/:chatId', deleteChat);

// ==================== MESSAGE ROUTES ====================

// Get messages in a conversation
chatRouter.get('/getConversationMessages/:userId', getConversationMessages);

// Send a message
chatRouter.post('/sendMessage', sendMessage);

// Get unread message count
chatRouter.get('/getUnreadCount', getUnreadCount);

// Mark messages as read
chatRouter.put('/markMessagesAsRead', markMessagesAsRead);

// Edit a message
chatRouter.put('/editMessage/:messageId', editMessage);

// Delete a message
chatRouter.delete('/deleteMessage/:messageId', deleteMessage);

// Search messages in conversation
chatRouter.get('/searchMessages/:userId', searchMessages);

export default chatRouter;
