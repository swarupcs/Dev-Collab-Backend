import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { getUserSocket } from './socketHandlers.js';


export const handleChatEvents = (socket, io, connectedUsers) => {
  // Join chat rooms
  socket.on('joinChat', async (chatId) => {
    try {
      // Verify user is participant of this chat
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isParticipant(socket.userId)) {
        socket.emit('error', { message: 'Unauthorized to join this chat' });
        return;
      }

      socket.join(`chat_${chatId}`);
      console.log(`👤 User ${socket.userId} joined chat ${chatId}`);

      socket.emit('joinedChat', { chatId, timestamp: new Date() });
    } catch (error) {
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  // Leave chat room
  socket.on('leaveChat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`👤 User ${socket.userId} left chat ${chatId}`);
  });

  // Send message
  socket.on('sendMessage', async (data) => {
    try {
      const { receiverId, text, messageType = 'text' } = data;

      // Validate input
      if (!receiverId || !text?.trim()) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      // Create message
      const message = new Message({
        senderId: socket.userId,
        receiverId,
        text: text.trim(),
        messageType,
      });

      await message.save();

      // Populate sender info
      await message.populate('senderId', 'username avatar');

      // Find or create chat
      const chat = await Chat.findOrCreateChat(socket.userId, receiverId);
      await chat.updateActivity(message._id);

      // Emit to sender (confirmation)
      socket.emit('messageSent', {
        message,
        chatId: chat._id,
        timestamp: new Date(),
      });

      // Check if receiver is online
      const receiverSocketId = getUserSocket(receiverId);
      if (receiverSocketId) {
        // Receiver is online - send real-time message
        io.to(receiverSocketId).emit('newMessage', {
          message,
          chatId: chat._id,
          sender: message.senderId,
          timestamp: new Date(),
        });
      } else {
        // Receiver is offline - could implement push notifications here
        console.log(
          `📱 User ${receiverId} is offline - could send push notification`
        );
      }
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Mark messages as read
  socket.on('markAsRead', async (data) => {
    try {
      const { senderId, chatId } = data;

      // Mark messages as read
      await Message.markAsRead(senderId, socket.userId);

      // Notify sender that messages were read (if online)
      const senderSocketId = getUserSocket(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messagesRead', {
          readBy: socket.userId,
          chatId,
          timestamp: new Date(),
        });
      }

      socket.emit('markedAsRead', { senderId, chatId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  // Typing indicators
  socket.on('startTyping', (data) => {
    const { receiverId, chatId } = data;
    const receiverSocketId = getUserSocket(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userTyping', {
        userId: socket.userId,
        chatId,
        isTyping: true,
      });
    }
  });

  socket.on('stopTyping', (data) => {
    const { receiverId, chatId } = data;
    const receiverSocketId = getUserSocket(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userTyping', {
        userId: socket.userId,
        chatId,
        isTyping: false,
      });
    }
  });

  // Delete message
  socket.on('deleteMessage', async (data) => {
    try {
      const { messageId, chatId } = data;

      const message = await Message.findById(messageId);
      if (
        !message ||
        message.senderId.toString() !== socket.userId.toString()
      ) {
        socket.emit('error', {
          message: 'Unauthorized to delete this message',
        });
        return;
      }

      // Soft delete
      message.deletedAt = new Date();
      await message.save();

      // Notify both users
      io.to(`chat_${chatId}`).emit('messageDeleted', {
        messageId,
        chatId,
        deletedBy: socket.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });
};
