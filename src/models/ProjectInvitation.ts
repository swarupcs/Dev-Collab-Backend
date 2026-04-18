import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IProjectInvitation extends Document {
  _id: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectInvitationSchema = new Schema<IProjectInvitation>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
ProjectInvitationSchema.index({ project: 1, user: 1 }, { unique: true });
ProjectInvitationSchema.index({ user: 1, status: 1 });

export const ProjectInvitation = mongoose.model<IProjectInvitation>(
  'ProjectInvitation',
  ProjectInvitationSchema
);
