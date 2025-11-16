import mongoose from 'mongoose';
import { ApiError } from '../utils/api-error.js';

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['ignored', 'interested', 'accepted', 'rejected'],
        message: '{VALUE} is an incorrect status type',
      },
    },
  },
  { timestamps: true }
);

// Create compound index for better query performance
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });

// Pre-save hook to prevent self-requests
connectionRequestSchema.pre('save', function (next) {
  if (this.fromUserId.equals(this.toUserId)) {
    return next(
      new ApiError(400, 'You cannot send a connection request to yourself.')
    );
  }
  next();
});

export const ConnectionRequest = mongoose.model(
  'ConnectionRequest',
  connectionRequestSchema
);
