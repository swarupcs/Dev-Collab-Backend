import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Message } from '../models/Message';
import { successResponse } from '../utils/response';

export class MessagesController {
  getMessages = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const currentUserId = req.userId!;
      const otherUserId = req.params.userId;

      const messages = await Message.find({
        $or: [
          { sender: currentUserId, receiver: otherUserId },
          { sender: otherUserId, receiver: currentUserId },
        ],
      })
        .sort({ createdAt: 1 })
        .populate('sender', 'firstName lastName avatarUrl')
        .populate('receiver', 'firstName lastName avatarUrl');

      successResponse(res, messages);
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const currentUserId = req.userId!;
      const otherUserId = req.params.userId;

      await Message.updateMany(
        { sender: otherUserId, receiver: currentUserId, read: false },
        { $set: { read: true } }
      );

      successResponse(res, null, 'Messages marked as read');
    } catch (error) {
      next(error);
    }
  };
}