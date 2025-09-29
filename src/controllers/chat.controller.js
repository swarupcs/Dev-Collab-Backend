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

  // ✅ populate participants with selected user fields
  const chats = await Chat.find({ participants: userId })
    .populate('participants', 'firstName lastName photoUrl emailId')
    .populate('lastMessage'); // optional: populate lastMessage too

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
        otherParticipant, // already has name, photoUrl etc. because of populate
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
  const otherUser = await User.findById(userId).select('_id username email avatar');
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

// ==================== MESSAGE CONTROLLERS (READ-ONLY) ====================

/**
* Get messages in a conversation (for loading history)
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

// ==================== SOCKET.IO HELPER FUNCTIONS ====================
// These are NOT REST endpoints - they're called from your Socket.IO handlers

/**
* Helper function to send a message (called from Socket.IO handler)
* @returns {Object} { message, chat } or throws error
*/
export const sendMessageSocket = async ({ senderId, receiverId, text, messageType = 'text' }) => {
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
  await message.populate('receiverId', 'username avatar');

  // Find or create chat
  const chat = await Chat.findOrCreateChat(senderId, receiverId);
  await chat.updateActivity(message._id);

  return { message, chat };
};

/**
* Helper function to mark messages as read (called from Socket.IO handler)
*/
export const markMessagesAsReadSocket = async ({ senderId, receiverId }) => {
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

  return { modifiedCount: result.modifiedCount, readAt: new Date() };
};

/**
* Helper function to edit a message (called from Socket.IO handler)
*/
export const editMessageSocket = async ({ messageId, userId, text }) => {
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

  return { message };
};

/**
* Helper function to delete a message (called from Socket.IO handler)
*/
export const deleteMessageSocket = async ({ messageId, userId }) => {
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

  return { messageId, deletedAt: message.deletedAt };
};

/**
* Helper function to handle typing status (called from Socket.IO handler)
*/
export const handleTypingSocket = async ({ userId, recipientId, isTyping }) => {
  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      throw new ApiError(400, 'Invalid recipient ID format');
  }

  // Check if recipient exists
  const recipient = await User.findById(recipientId).select('_id');
  if (!recipient) {
      throw new ApiError(404, 'Recipient not found');
  }

  return { userId, isTyping };
};