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
      validate: [
        {
          validator: function (participants) {
            return participants.length === 2;
          },
          message: 'Chat must have exactly 2 participants',
        },
        {
          validator: function (participants) {
            // Ensure no duplicate participants (user can't chat with themselves)
            const uniqueParticipants = new Set(
              participants.map((p) => p.toString())
            );
            return uniqueParticipants.size === participants.length;
          },
          message:
            'Participants must be unique (user cannot chat with themselves)',
        },
      ],
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

// FIXED: Compound index for unique participant combinations
// This ensures that each pair of users can have only one chat
chatSchema.index(
  {
    'participants.0': 1,
    'participants.1': 1,
  },
  {
    unique: true,
    name: 'unique_participants_pair',
  }
);

// Index for efficient querying by last activity
chatSchema.index({ lastActivity: -1 });

// Index for finding chats by participant
chatSchema.index({ participants: 1 });

// Virtual to get the other participant
chatSchema.virtual('getOtherParticipant').get(function () {
  return (currentUserId) => {
    return this.participants.find(
      (p) => p._id.toString() !== currentUserId.toString()
    );
  };
});

// Pre-save middleware to sort participants for consistent ordering
chatSchema.pre('save', function (next) {
  // Sort participants to ensure consistent ordering for the compound index
  this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  next();
});

// Pre-validate middleware to ensure participants are sorted before validation
chatSchema.pre('validate', function (next) {
  if (this.participants && this.participants.length === 2) {
    // Sort participants to ensure consistent ordering
    this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  }
  next();
});

// Static method to find or create chat between two users
chatSchema.statics.findOrCreateChat = async function (user1Id, user2Id) {
  // Ensure we're not trying to create a chat with the same user
  if (user1Id.toString() === user2Id.toString()) {
    throw new Error('Cannot create chat with the same user');
  }

  // Sort participants for consistent ordering
  const participants = [user1Id, user2Id].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );

  try {
    // Try to find existing chat first
    let chat = await this.findOne({
      participants: { $all: participants },
    }).populate('participants', 'username avatar email');

    if (!chat) {
      // Create new chat if none exists
      chat = await this.create({ participants });
      // Populate after creation
      chat = await chat.populate('participants', 'username avatar email');
    }

    return chat;
  } catch (error) {
    if (error.code === 11000) {
      // Handle race condition - try to find the chat that was just created
      const existingChat = await this.findOne({
        participants: { $all: participants },
      }).populate('participants', 'username avatar email');

      if (existingChat) {
        return existingChat;
      }
    }
    throw error;
  }
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

// Static method to find specific chat between two users
chatSchema.statics.findChatBetweenUsers = function (user1Id, user2Id) {
  const participants = [user1Id, user2Id].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );

  return this.findOne({
    participants: { $all: participants },
  })
    .populate('participants', 'username avatar email')
    .populate('lastMessage');
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

// Instance method to check if chat is blocked
chatSchema.methods.isBlocked = function () {
  return !!this.blockedBy;
};

// Instance method to check if chat is blocked by specific user
chatSchema.methods.isBlockedBy = function (userId) {
  return this.blockedBy && this.blockedBy.toString() === userId.toString();
};

const Chat = model('Chat', chatSchema);

export { Chat, chatSchema };
export default Chat;
