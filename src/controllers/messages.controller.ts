import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Message } from '../models/Message';
import { successResponse } from '../utils/response';

export class MessagesController {
  getConversations = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const currentUserId = req.userId!;

      const messages = await Message.find({
        $or: [{ sender: currentUserId }, { receiver: currentUserId }],
      })
        .sort({ createdAt: -1 })
        .populate('sender', 'firstName lastName avatarUrl')
        .populate('receiver', 'firstName lastName avatarUrl');

      const conversationsMap = new Map();

      messages.forEach((msg) => {
        const otherUser =
          msg.sender.id === currentUserId ? msg.receiver : msg.sender;

        if (!conversationsMap.has(otherUser.id)) {
          conversationsMap.set(otherUser.id, {
            user: otherUser,
            lastMessage: msg,
            unreadCount: msg.receiver.id === currentUserId && !msg.read ? 1 : 0,
          });
        } else if (msg.receiver.id === currentUserId && !msg.read) {
          const conv = conversationsMap.get(otherUser.id);
          conv.unreadCount += 1;
        }
      });

      const conversations = Array.from(conversationsMap.values());
      successResponse(res, conversations);
    } catch (error) {
      next(error);
    }
  };

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