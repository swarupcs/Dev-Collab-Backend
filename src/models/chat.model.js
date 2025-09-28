import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const chatSchema = new Schema(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      validate: {
        validator: function (participants) {
          return participants.length === 2;
        },
        message: 'Chat must have exactly 2 participants',
      },
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Optional: Store blocked status
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique compound index to prevent duplicate chats
chatSchema.index({ participants: 1 }, { unique: true });
chatSchema.index({ lastActivity: -1 });

// Virtual to get the other participant
chatSchema.virtual('getOtherParticipant').get(function () {
  // This would be used in context where current user is known
  // Usage: chat.getOtherParticipant(currentUserId)
  return (currentUserId) => {
    return this.participants.find(
      (p) => p._id.toString() !== currentUserId.toString()
    );
  };
});

// Pre-save middleware to sort participants for consistent ordering
chatSchema.pre('save', function (next) {
  // Sort participants to ensure consistent ordering
  this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  next();
});

// Static method to find or create chat between two users
chatSchema.statics.findOrCreateChat = async function (user1Id, user2Id) {
  const participants = [user1Id, user2Id].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );

  let chat = await this.findOne({ participants });

  if (!chat) {
    chat = await this.create({ participants });
  }

  return chat.populate('participants', 'username avatar email');
};

// Static method to get user's active chats
chatSchema.statics.getUserChats = function (userId) {
  return this.find({
    participants: userId,
    isActive: true,
  })
    .populate('participants', 'username avatar email lastSeen')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });
};

// Instance method to update last activity
chatSchema.methods.updateActivity = function (messageId = null) {
  this.lastActivity = new Date();
  if (messageId) {
    this.lastMessage = messageId;
  }
  return this.save();
};

// Instance method to check if user is participant
chatSchema.methods.isParticipant = function (userId) {
  return this.participants.some((p) => p._id.toString() === userId.toString());
};

// Instance method to block/unblock chat
chatSchema.methods.toggleBlock = function (userId) {
  if (this.blockedBy && this.blockedBy.toString() === userId.toString()) {
    this.blockedBy = undefined;
  } else {
    this.blockedBy = userId;
  }
  return this.save();
};

const Chat = model('Chat', chatSchema);

export { Chat, chatSchema };
export default Chat;

// ================================================================

// models/index.js - Central export file
export { default as Chat } from './Chat.js';
export { default as Message } from './Message.js';

// ================================================================

// Usage Examples:

/*
// Create or find a chat between two users
const chat = await Chat.findOrCreateChat(user1Id, user2Id);

// Send a message
const message = new Message({
  senderId: user1Id,
  receiverId: user2Id,
  text: "Hello!"
});
await message.save();
await chat.updateActivity(message._id);

// Get conversation
const messages = await Message.getConversation(user1Id, user2Id, 20);

// Mark messages as read
await Message.markAsRead(user2Id, user1Id);

// Get unread count for a user
const unreadCount = await Message.getUnreadCount(user1Id);

// Get user's active chats
const userChats = await Chat.getUserChats(user1Id);
*/
