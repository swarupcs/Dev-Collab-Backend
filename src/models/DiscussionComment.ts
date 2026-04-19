import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IDiscussionComment extends Document {
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  parentComment?: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionCommentSchema = new Schema<IDiscussionComment>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'DiscussionPost',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'DiscussionComment',
      default: null,
    },
    content: {
      type: String,
      required: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
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

DiscussionCommentSchema.index({ post: 1, createdAt: 1 });
DiscussionCommentSchema.index({ parentComment: 1 });

export const DiscussionComment = mongoose.model<IDiscussionComment>('DiscussionComment', DiscussionCommentSchema);
