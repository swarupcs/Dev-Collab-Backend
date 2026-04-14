import mongoose, { Schema, Document } from 'mongoose';

export interface ICollaborationRequest extends Document {
  _id: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

const CollaborationRequestSchema = new Schema<ICollaborationRequest>(
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
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
CollaborationRequestSchema.index({ project: 1, user: 1 }, { unique: true });
CollaborationRequestSchema.index({ project: 1, status: 1 });

export const CollaborationRequest = mongoose.model<ICollaborationRequest>(
  'CollaborationRequest',
  CollaborationRequestSchema
);
