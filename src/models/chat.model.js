// models/Chat.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const chatSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
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
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Ensure exactly 2 participants
chatSchema.pre('validate', function (next) {
  if (this.participants.length !== 2) {
    return next(new Error('Chat must have exactly 2 participants.'));
  }
  this.participants.sort(); // sort for uniqueness
  next();
});

// ✅ Unique index to avoid duplicate chats
chatSchema.index(
  { 'participants.0': 1, 'participants.1': 1 },
  { unique: true }
);

// Update activity when a new message arrives
chatSchema.methods.updateActivity = function (messageId) {
  this.lastActivity = new Date();
  if (messageId) this.lastMessage = messageId;
  return this.save();
};

// Static method to find or create chat
chatSchema.statics.findOrCreateChat = async function (user1Id, user2Id) {
  if (user1Id.toString() === user2Id.toString()) {
    throw new Error('Cannot create chat with yourself');
  }

  const participants = [user1Id, user2Id].sort();
  let chat = await this.findOne({ participants });

  if (!chat) {
    chat = await this.create({ participants });
  }

  return chat;
};

// ✅ Static method: get all active chats for a user
chatSchema.statics.getUserChats = function (userId) {
  return this.find({
    participants: userId,
    isActive: true,
  })
    .populate('participants', 'firstName lastName emailId photoUrl')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });
};

export const Chat = model('Chat', chatSchema);

