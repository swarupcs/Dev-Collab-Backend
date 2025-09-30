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

// Mark messages as read
messageSchema.statics.markAsRead = function (chatId, receiverId) {
  return this.updateMany(
    { chatId, receiverId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Soft delete
messageSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

export const Message = model('Message', messageSchema);

