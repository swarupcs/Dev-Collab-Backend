import mongoose from 'mongoose';

import Chat from '../models/chat.model.js';
import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils.js/async-handler.js';
import { ApiResponse } from '../utils.js/api-response.js';
import { ApiError } from '../utils.js/api-error.js';
import Message from '../models/message.model.js';

// ==================== CHAT CONTROLLERS ====================

/**
 * Get all user's chats with last message and unread count
 */
export const getUserChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const chats = await Chat.getUserChats(userId);

  // Get unread counts for each chat
  const chatsWithUnreadCount = await Promise.all(
    chats.map(async (chat) => {
      const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      const unreadCount = await Message.countDocuments({
        senderId: otherParticipant._id,
        receiverId: userId,
        isRead: false,
        deletedAt: { $exists: false },
      });

      return {
        ...chat.toObject(),
        unreadCount,
        otherParticipant,
      };
    })
  );

  return new ApiResponse(
    200,
    { chats: chatsWithUnreadCount },
    'Chats retrieved successfully'
  ).send(res);
});

/**
 * Create or find existing chat between two users
 */
export const createChat = asyncHandler(async (req, res) => {
  const { userId } = req.body; // Other user's ID
  const currentUserId = req.user._id;

  if (!userId) {
    throw new ApiError(400, 'User ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID format');
  }

  if (userId === currentUserId.toString()) {
    throw new ApiError(400, 'Cannot create chat with yourself');
  }

  // Check if the other user exists
  const otherUser = await User.findById(userId).select('_id username email');
  if (!otherUser) {
    throw new ApiError(404, 'User not found');
  }

  const chat = await Chat.findOrCreateChat(currentUserId, userId);

  return new ApiResponse(201, { chat }, 'Chat created successfully').send(res);
});

/**
 * Get specific chat by ID
 */
export const getChatById = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, 'Invalid chat ID format');
  }

  const chat = await Chat.findById(chatId)
    .populate('participants', 'username email avatar lastSeen')
    .populate('lastMessage');

  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  // Check if user is participant
  if (!chat.isParticipant(userId)) {
    throw new ApiError(
      403,
      'Access denied - you are not a participant in this chat'
    );
  }

  return new ApiResponse(200, { chat }, 'Chat retrieved successfully').send(
    res
  );
});

/**
 * Delete/Archive a chat
 */
export const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, 'Invalid chat ID format');
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, 'Chat not found');
  }

  if (!chat.isParticipant(userId)) {
    throw new ApiError(
      403,
      'Access denied - you are not a participant in this chat'
    );
  }

  // Soft delete - mark as inactive for this user
  chat.isActive = false;
  await chat.save();

  return new ApiResponse(200, null, 'Chat deleted successfully').send(res);
});

// ==================== MESSAGE CONTROLLERS ====================

/**
 * Get messages in a conversation
 */
export const getConversationMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params; // Other user's ID
  const currentUserId = req.user._id;
  const { page = 1, limit = 50 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID format');
  }

  // Check if the other user exists
  const otherUser = await User.findById(userId).select('_id');
  if (!otherUser) {
    throw new ApiError(404, 'User not found');
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ApiError(400, 'Invalid pagination parameters');
  }

  const [messages, totalMessages] = await Promise.all([
    Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
      deletedAt: { $exists: false },
    })
      .populate('senderId', 'username avatar')
      .populate('receiverId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum),

    Message.countDocuments({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId },
      ],
      deletedAt: { $exists: false },
    }),
  ]);

  const responseData = {
    messages: messages.reverse(), // Reverse to show oldest first
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalMessages,
      pages: Math.ceil(totalMessages / limitNum),
    },
  };

  return new ApiResponse(
    200,
    responseData,
    'Messages retrieved successfully'
  ).send(res);
});

/**
 * Send a message (REST endpoint, real-time handled by Socket.IO)
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, text, messageType = 'text' } = req.body;
  const senderId = req.user._id;

  if (!receiverId || !text?.trim()) {
    throw new ApiError(400, 'Receiver ID and message text are required');
  }

  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    throw new ApiError(400, 'Invalid receiver ID format');
  }

  if (senderId.toString() === receiverId.toString()) {
    throw new ApiError(400, 'Cannot send message to yourself');
  }

  // Check if receiver exists
  const receiver = await User.findById(receiverId).select('_id username');
  if (!receiver) {
    throw new ApiError(404, 'Receiver not found');
  }

  // Create message
  const message = new Message({
    senderId,
    receiverId,
    text: text.trim(),
    messageType,
  });

  await message.save();
  await message.populate('senderId', 'username avatar');

  // Find or create chat
  const chat = await Chat.findOrCreateChat(senderId, receiverId);
  await chat.updateActivity(message._id);

  // Emit to Socket.IO if available
  if (req.io) {
    const receiverSocket = req.connectedUsers?.get(receiverId.toString());
    if (receiverSocket) {
      req.io.to(receiverSocket.socketId).emit('newMessage', {
        message,
        chatId: chat._id,
        sender: message.senderId,
      });
    }
  }

  return new ApiResponse(
    201,
    { message, chatId: chat._id },
    'Message sent successfully'
  ).send(res);
});

/**
 * Get unread message count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const unreadCount = await Message.countDocuments({
    receiverId: userId,
    isRead: false,
    deletedAt: { $exists: false },
  });

  return new ApiResponse(
    200,
    { unreadCount },
    'Unread count retrieved successfully'
  ).send(res);
});

/**
 * Mark messages as read
 */
export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { senderId } = req.body; // ID of user who sent the messages
  const receiverId = req.user._id;

  if (!senderId) {
    throw new ApiError(400, 'Sender ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(senderId)) {
    throw new ApiError(400, 'Invalid sender ID format');
  }

  // Check if sender exists
  const sender = await User.findById(senderId).select('_id');
  if (!sender) {
    throw new ApiError(404, 'Sender not found');
  }

  const result = await Message.updateMany(
    {
      senderId,
      receiverId,
      isRead: false,
      deletedAt: { $exists: false },
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  // Notify sender via Socket.IO if available
  if (req.io) {
    const senderSocket = req.connectedUsers?.get(senderId.toString());
    if (senderSocket) {
      req.io.to(senderSocket.socketId).emit('messagesRead', {
        readBy: receiverId,
        readAt: new Date(),
      });
    }
  }

  return new ApiResponse(
    200,
    { modifiedCount: result.modifiedCount },
    `${result.modifiedCount} messages marked as read`
  ).send(res);
});

/**
 * Edit a message
 */
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  if (!text?.trim()) {
    throw new ApiError(400, 'Message text is required');
  }

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new ApiError(400, 'Invalid message ID format');
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.senderId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only edit your own messages');
  }

  if (message.deletedAt) {
    throw new ApiError(400, 'Cannot edit deleted message');
  }

  message.text = text.trim();
  message.edited = true;
  message.editedAt = new Date();
  await message.save();

  // Notify via Socket.IO if available
  if (req.io) {
    const receiverSocket = req.connectedUsers?.get(
      message.receiverId.toString()
    );
    if (receiverSocket) {
      req.io.to(receiverSocket.socketId).emit('messageEdited', {
        messageId,
        newText: message.text,
        editedAt: message.editedAt,
      });
    }
  }

  return new ApiResponse(200, { message }, 'Message edited successfully').send(
    res
  );
});

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new ApiError(400, 'Invalid message ID format');
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.senderId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only delete your own messages');
  }

  if (message.deletedAt) {
    throw new ApiError(400, 'Message is already deleted');
  }

  message.deletedAt = new Date();
  await message.save();

  // Notify via Socket.IO if available
  if (req.io) {
    const receiverSocket = req.connectedUsers?.get(
      message.receiverId.toString()
    );
    if (receiverSocket) {
      req.io.to(receiverSocket.socketId).emit('messageDeleted', {
        messageId,
        deletedBy: userId,
      });
    }
  }

  return new ApiResponse(200, null, 'Message deleted successfully').send(res);
});

/**
 * Search messages in conversation
 */
export const searchMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params; // Other user's ID
  const { query, page = 1, limit = 20 } = req.query;
  const currentUserId = req.user._id;

  if (!query?.trim()) {
    throw new ApiError(400, 'Search query is required');
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID format');
  }

  // Check if the other user exists
  const otherUser = await User.findById(userId).select('_id');
  if (!otherUser) {
    throw new ApiError(404, 'User not found');
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
    throw new ApiError(400, 'Invalid pagination parameters');
  }

  const messages = await Message.find({
    $or: [
      { senderId: currentUserId, receiverId: userId },
      { senderId: userId, receiverId: currentUserId },
    ],
    text: { $regex: query.trim(), $options: 'i' },
    deletedAt: { $exists: false },
  })
    .populate('senderId', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .skip((pageNum - 1) * limitNum);

  return new ApiResponse(
    200,
    { messages, searchQuery: query.trim() },
    'Messages searched successfully'
  ).send(res);
});
