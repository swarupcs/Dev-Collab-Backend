import { Chat } from '../models/chat.model.js';
import { Message } from '../models/message.model.js';
import { ConnectionRequest } from '../models/connectionRequest.model.js';

// ✅ Online users storage
const onlineUsers = new Map();

/**
 * Get online users map
 */
export const getOnlineUsers = () => onlineUsers;

/**
 * Handle user registration
 */
const handleRegister = (socket, userId) => {
  onlineUsers.set(userId.toString(), socket.id);
  console.log(`✅ User ${userId} registered on socket ${socket.id}`);
};

/**
 * Handle sending messages
 */
const handleSendMessage = async (
  io,
  socket,
  { senderId, receiverId, text }
) => {
  try {
    // 1. Verify connection exists
    const isConnected = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: senderId, toUserId: receiverId, status: 'accepted' },
        { fromUserId: receiverId, toUserId: senderId, status: 'accepted' },
      ],
    });

    if (!isConnected) {
      return socket.emit('error_message', {
        error: 'You can only send messages to connected users.',
      });
    }

    // 2. Find or create chat
    const chat = await Chat.findOrCreateChat(senderId, receiverId);

    // 3. Save message
    const newMessage = await Message.create({
      chatId: chat._id,
      senderId,
      receiverId,
      text,
    });

    // 4. Update chat activity
    await chat.updateActivity(newMessage._id);

    // 5. Emit to receiver if online
    const receiverSocketId = onlineUsers.get(receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', {
        chatId: chat._id,
        ...newMessage.toObject(),
      });
    }

    // 6. Confirm to sender
    socket.emit('message_sent', {
      chatId: chat._id,
      ...newMessage.toObject(),
    });
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
    socket.emit('error_message', { error: 'Failed to send message' });
  }
};

/**
 * Handle marking messages as read
 */
const handleMarkAsRead = async (socket, { chatId, receiverId }) => {
  try {
    await Message.markAsRead(chatId, receiverId);
    socket.emit('messages_read', { chatId });
  } catch (error) {
    console.error('❌ Error marking messages as read:', error.message);
  }
};

/**
 * Handle user disconnect
 */
const handleDisconnect = (socket) => {
  for (const [userId, sId] of onlineUsers.entries()) {
    if (sId === socket.id) {
      onlineUsers.delete(userId);
      console.log(`❌ User ${userId} disconnected`);
      break;
    }
  }
};

/**
 * Setup socket.io event listeners
 */
export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('🔗 Socket connected:', socket.id);

    // Register user
    socket.on('register', (userId) => handleRegister(socket, userId));

    // Send message
    socket.on('send_message', (data) => handleSendMessage(io, socket, data));

    // Mark messages as read
    socket.on('mark_as_read', (data) => handleMarkAsRead(socket, data));

    // Handle disconnect
    socket.on('disconnect', () => handleDisconnect(socket));
  });
};
