import express from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { deleteMessage, editMessage, getChatMessages, getUserChats, markMessagesAsRead, sendMessage } from '../../controllers/chat.controller.js';


const chatRouter = express.Router();

chatRouter.use(authMiddleware);

// Chats
chatRouter.get('/getUserChats', getUserChats);
chatRouter.get('/:chatId/messages', getChatMessages);
chatRouter.post('/send', sendMessage);
chatRouter.patch('/:chatId/read', markMessagesAsRead);

// Messages
chatRouter.delete('/message/:messageId', deleteMessage);
chatRouter.patch('/message/:messageId/edit', editMessage);

export default chatRouter;
