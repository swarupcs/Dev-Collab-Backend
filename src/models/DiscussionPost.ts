import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IDiscussionPost extends Document {
  author: mongoose.Types.ObjectId;
  title: string;
  content: string;
  category: 'Tech' | 'Design' | 'Career' | 'Open Source' | 'DevOps' | 'AI/ML' | 'Announcements';
  likes: mongoose.Types.ObjectId[];
  bookmarks: mongoose.Types.ObjectId[];
  shares: number;
  commentsCount: number;
  reactions: {
    emoji: string;
    users: mongoose.Types.ObjectId[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionPostSchema = new Schema<IDiscussionPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Tech', 'Design', 'Career', 'Open Source', 'DevOps', 'AI/ML', 'Announcements'],
      required: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    shares: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DiscussionPostSchema.index({ category: 1, createdAt: -1 });
DiscussionPostSchema.index({ author: 1 });

export const DiscussionPost = mongoose.model<IDiscussionPost>('DiscussionPost', DiscussionPostSchema);
