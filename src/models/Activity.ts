import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IActivity extends Document {
  user: mongoose.Types.ObjectId;
  type: 'CONNECTION_ACCEPTED' | 'PROJECT_CREATED' | 'REQUEST_SENT' | 'NEW_MESSAGE' | 'COLLAB_INVITE' | 'PROFILE_VIEW' | 'DISCUSSION_REPLY';
  content: string;
  relatedUser?: mongoose.Types.ObjectId;
  relatedProject?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'CONNECTION_ACCEPTED',
        'PROJECT_CREATED',
        'REQUEST_SENT',
        'NEW_MESSAGE',
        'COLLAB_INVITE',
        'PROFILE_VIEW',
        'DISCUSSION_REPLY',
      ],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    relatedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedProject: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    read: {
      type: Boolean,
      default: false,
    },
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

ActivitySchema.index({ user: 1, createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
