// socketHandlers.js

import { Chat } from '../models/chat.model.js';
import { Message } from '../models/message.model.js';


const onlineUsers = new Map();

export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('🔗 Connected:', socket.id);

    socket.on('register', (userId) => {
      onlineUsers.set(userId.toString(), socket.id);
    });

    socket.on('send_message', async ({ senderId, receiverId, text }) => {
      try {
        // 1. Ensure chat exists
        const chat = await Chat.findOrCreateChat(senderId, receiverId);

        // 2. Save message
        const msg = await Message.create({
          chatId: chat._id,
          senderId,
          receiverId,
          text,
        });

        // 3. Update chat
        await chat.updateActivity(msg._id);

        // 4. Emit to receiver if online
        const receiverSocket = onlineUsers.get(receiverId.toString());
        if (receiverSocket) {
          io.to(receiverSocket).emit('receive_message', msg);
        }

        // 5. Confirm back to sender
        socket.emit('message_sent', msg);
      } catch (err) {
        console.error('❌ Error sending message:', err.message);
        socket.emit('error_message', { error: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, sId] of onlineUsers.entries()) {
        if (sId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
    });
  });
};
