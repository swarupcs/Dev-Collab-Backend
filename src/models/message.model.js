import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver ID is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
      minlength: [1, 'Message cannot be empty'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date, // Soft delete
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient chat queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 }); // For unread messages

// Virtual for checking if message is deleted
messageSchema.virtual('isDeleted').get(function () {
  return !!this.deletedAt;
});

// Pre-save middleware to handle read status and editing
messageSchema.pre('save', function (next) {
  // Set readAt when isRead is set to true
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }

  // Set editing flags when text is modified
  if (this.isModified('text') && !this.isNew) {
    this.edited = true;
    this.editedAt = new Date();
  }

  next();
});

// Static method to get conversation between two users
messageSchema.statics.getConversation = function (
  user1Id,
  user2Id,
  limit = 50
) {
  return this.find({
    $or: [
      { senderId: user1Id, receiverId: user2Id },
      { senderId: user2Id, receiverId: user1Id },
    ],
    deletedAt: { $exists: false },
  })
    .populate('senderId', 'username avatar')
    .populate('receiverId', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = function (senderId, receiverId) {
  return this.updateMany(
    {
      senderId: senderId,
      receiverId: receiverId,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    receiverId: userId,
    isRead: false,
    deletedAt: { $exists: false },
  });
};

const Message = mongoose.model('Message', messageSchema);

export { messageSchema, Message };
export default Message;
