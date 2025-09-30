// models/Message.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    fileUrl: String,
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
messageSchema.index({ chatId: 1, createdAt: -1 });

/**
 * Get messages for a chat with pagination.
 * - chatId: ObjectId or string
 * - limit: number (default 50)
 * - before: optional ISO date string or timestamp (returns messages created before this date)
 *
 * Returns messages sorted by createdAt DESC (most recent first).
 */
messageSchema.statics.getChatMessages = function (
  chatId,
  limit = 50,
  before = null
) {
  const query = {
    chatId: chatId,
    deletedAt: { $exists: false },
  };

  if (before) {
    // Accept either a date string / timestamp. If invalid, ignore.
    const maybeDate = new Date(before);
    if (!isNaN(maybeDate.getTime())) {
      query.createdAt = { $lt: maybeDate };
    }
  }

  return this.find(query)
    .populate('senderId', 'firstName lastName emailId photoUrl') // adjust fields to match your User model
    .populate('receiverId', 'firstName lastName emailId photoUrl')
    .sort({ createdAt: -1 }) // most recent first
    .limit(typeof limit === 'number' ? limit : parseInt(limit, 10));
};

// Mark messages as read (keeps your existing signature)
messageSchema.statics.markAsRead = function (chatId, receiverId) {
  return this.updateMany(
    { chatId, receiverId, isRead: false, deletedAt: { $exists: false } },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Soft delete
messageSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

export const Message = model('Message', messageSchema);
export default Message;
