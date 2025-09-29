import mongoose from 'mongoose';
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    // Add reference to the chat for better organization
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: [true, 'Chat ID is required'],
      index: true,
    },
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
      enum: ['text', 'image', 'file', 'system'], // Added 'system' for system messages
      default: 'text',
    },
    // File/Image specific fields
    fileUrl: {
      type: String,
      validate: {
        validator: function (v) {
          // Only required for image/file types
          return (
            this.messageType === 'text' || this.messageType === 'system' || !!v
          );
        },
        message: 'File URL is required for file and image messages',
      },
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true, // Add index for better query performance
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
    // Store original text for edit history (optional)
    originalText: {
      type: String,
    },
    deletedAt: {
      type: Date, // Soft delete
    },
    // Add reply functionality
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Don't return deleted messages in JSON
        if (ret.deletedAt) {
          ret.text = 'This message was deleted';
          ret.fileUrl = undefined;
          ret.fileName = undefined;
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// INDEXES FOR BETTER PERFORMANCE
// Primary index for chat-based queries (most common)
messageSchema.index({ chatId: 1, createdAt: -1 });

// Keep your existing indexes but optimize them
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1, deletedAt: 1 }); // Added deletedAt for unread queries

// Additional useful indexes
messageSchema.index({ createdAt: -1 }); // For global recent messages
messageSchema.index({ replyTo: 1 }); // For reply chains

// VIRTUALS
// Virtual for checking if message is deleted
messageSchema.virtual('isDeleted').get(function () {
  return !!this.deletedAt;
});

// Virtual for getting formatted time
messageSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
});

// MIDDLEWARE
// Pre-save middleware to handle read status and editing
messageSchema.pre('save', function (next) {
  // Set readAt when isRead is set to true
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }

  // Handle editing
  if (
    this.isModified('text') &&
    !this.isNew &&
    this.text !== this.originalText
  ) {
    if (!this.edited) {
      this.originalText = this.text; // Store original on first edit
    }
    this.edited = true;
    this.editedAt = new Date();
  }

  next();
});

// STATIC METHODS
// Get conversation by chat ID (more efficient)
messageSchema.statics.getChatMessages = function (
  chatId,
  limit = 50,
  before = null
) {
  const query = {
    chatId: chatId,
    deletedAt: { $exists: false },
  };

  // Add pagination support
  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .populate('senderId', 'username avatar')
    .populate('receiverId', 'username avatar')
    .populate('replyTo', 'text senderId')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Original method - still useful for direct user queries
messageSchema.statics.getConversation = function (
  user1Id,
  user2Id,
  limit = 50,
  before = null
) {
  const query = {
    $or: [
      { senderId: user1Id, receiverId: user2Id },
      { senderId: user2Id, receiverId: user1Id },
    ],
    deletedAt: { $exists: false },
  };

  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .populate('senderId', 'username avatar')
    .populate('receiverId', 'username avatar')
    .populate('replyTo', 'text senderId')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Improved mark as read - can work with chat ID
messageSchema.statics.markAsRead = function (
  receiverId,
  senderId = null,
  chatId = null
) {
  const query = {
    receiverId: receiverId,
    isRead: false,
    deletedAt: { $exists: false },
  };

  if (chatId) {
    query.chatId = chatId;
  } else if (senderId) {
    query.senderId = senderId;
  }

  return this.updateMany(query, {
    isRead: true,
    readAt: new Date(),
  });
};

// Enhanced unread count with optional chat filtering
messageSchema.statics.getUnreadCount = function (userId, chatId = null) {
  const query = {
    receiverId: userId,
    isRead: false,
    deletedAt: { $exists: false },
  };

  if (chatId) {
    query.chatId = chatId;
  }

  return this.countDocuments(query);
};

// Get unread count per chat for a user
messageSchema.statics.getUnreadCountPerChat = function (userId) {
  return this.aggregate([
    {
      $match: {
        receiverId: new mongoose.Types.ObjectId(userId),
        isRead: false,
        deletedAt: { $exists: false },
      },
    },
    {
      $group: {
        _id: '$chatId',
        unreadCount: { $sum: 1 },
        lastMessage: { $max: '$createdAt' },
      },
    },
    {
      $lookup: {
        from: 'chats',
        localField: '_id',
        foreignField: '_id',
        as: 'chat',
      },
    },
    {
      $unwind: '$chat',
    },
    {
      $sort: { lastMessage: -1 },
    },
  ]);
};

// INSTANCE METHODS
// Soft delete message
messageSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

// Edit message
messageSchema.methods.editMessage = function (newText) {
  if (!this.originalText) {
    this.originalText = this.text;
  }
  this.text = newText;
  return this.save(); // Pre-save middleware will handle edited flags
};

// Check if user can edit this message
messageSchema.methods.canEdit = function (userId, timeLimit = 15) {
  // 15 minutes default
  if (this.senderId.toString() !== userId.toString()) return false;
  if (this.deletedAt) return false;

  const timeDiff = (new Date() - this.createdAt) / (1000 * 60); // minutes
  return timeDiff <= timeLimit;
};

// Check if user can delete this message
messageSchema.methods.canDelete = function (userId) {
  return this.senderId.toString() === userId.toString() && !this.deletedAt;
};

const Message = mongoose.model('Message', messageSchema);

export { messageSchema, Message };
export default Message;


/*
// This approach will give you better performance, more features, and cleaner data organization.
// When creating a message, first ensure chat exists
const chat = await Chat.findOrCreateChat(senderId, receiverId);

const message = new Message({
  chatId: chat._id,
  senderId,
  receiverId,
  text: messageText
});

await message.save();
await chat.updateActivity(message._id);


*/