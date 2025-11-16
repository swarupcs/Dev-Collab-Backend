import { Chat } from '../models/chat.model.js';
import { Message } from '../models/message.model.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

/**
 * ✅ Get all active chats for logged-in user
 */
export const getUserChats = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const chats = await Chat.getUserChats(userId);

  return new ApiResponse(200, { chats }, 'Chats fetched successfully').send(
    res
  );
});

/**
 * ✅ Get messages for a chat (with pagination)
 */
export const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { limit = 50, before } = req.query;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found');

  if (!chat.isParticipant(req.user._id)) {
    throw new ApiError(403, 'You are not a participant of this chat');
  }

  const messages = await Message.getChatMessages(
    chatId,
    parseInt(limit),
    before
  );

  return new ApiResponse(
    200,
    { messages },
    'Messages fetched successfully'
  ).send(res);
});

/**
 * ✅ Send a message (REST fallback, sockets handle realtime)
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.user?._id;
  const { receiverId, text } = req.body;

  if (!receiverId || !text) {
    throw new ApiError(400, 'Receiver and text are required');
  }

  // Check if users are connected
  const isConnected = await ConnectionRequest.findOne({
    $or: [
      { fromUserId: senderId, toUserId: receiverId, status: 'accepted' },
      { fromUserId: receiverId, toUserId: senderId, status: 'accepted' },
    ],
  });

  if (!isConnected) {
    throw new ApiError(403, 'You can only message connected users');
  }

  // Find or create chat
  const chat = await Chat.findOrCreateChat(senderId, receiverId);

  // Save message
  const message = await Message.create({
    chatId: chat._id,
    senderId,
    receiverId,
    text,
  });

  // Update chat activity
  await chat.updateActivity(message._id);

  return new ApiResponse(201, { message }, 'Message sent successfully').send(
    res
  );
});

/**
 * ✅ Mark all messages in a chat as read
 */
export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?._id;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found');

  if (!chat.isParticipant(userId)) {
    throw new ApiError(403, 'You are not a participant of this chat');
  }

  await Message.markAsRead(chatId, userId);

  return new ApiResponse(200, { chatId }, 'Messages marked as read').send(res);
});

/**
 * ✅ Delete a message (soft delete)
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?._id;

  const msg = await Message.findById(messageId);
  if (!msg) throw new ApiError(404, 'Message not found');

  if (msg.senderId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only delete your own messages');
  }

  await msg.softDelete();

  return new ApiResponse(
    200,
    { messageId },
    'Message deleted successfully'
  ).send(res);
});

/**
 * ✅ Edit a message
 */
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?._id;
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    throw new ApiError(400, 'Message text cannot be empty');
  }

  const msg = await Message.findById(messageId);
  if (!msg) throw new ApiError(404, 'Message not found');

  if (!msg.canEdit(userId)) {
    throw new ApiError(403, 'You cannot edit this message');
  }

  await msg.editMessage(text);

  return new ApiResponse(
    200,
    { message: msg },
    'Message updated successfully'
  ).send(res);
});
