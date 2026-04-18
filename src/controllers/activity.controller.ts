import type { Response, NextFunction } from 'express';
import { Activity } from '../models/Activity';
import { successResponse } from '../utils/response';
import type { AuthRequest } from '../middlewares/auth.middleware';

export class ActivityController {
  getActivities = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const activities = await Activity.find({ user: req.userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('relatedUser', 'firstName lastName avatarUrl')
        .populate('relatedProject', 'title');

      successResponse(res, activities);
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
      await Activity.updateMany(
        { user: req.userId, read: false },
        { read: true }
      );
      successResponse(res, null, 'Activities marked as read');
    } catch (error) {
      next(error);
    }
  };
}
