import { Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export class UsersController {
  private usersService: UsersService;

  constructor() {
    this.usersService = new UsersService();
  }

  getMyProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.usersService.getUserProfile(req.userId!);
      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  };

  updateMyProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.usersService.updateUserProfile(
        req.userId!,
        req.body
      );
      successResponse(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.usersService.getUserProfile(req.params.userId);
      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  };

  searchUsers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query, skills, page = 1, limit = 10 } = req.query;

      const skillsArray = skills
        ? (skills as string).split(',').map((s) => s.trim())
        : undefined;

      const result = await this.usersService.searchUsers(
        query as string,
        skillsArray,
        parseInt(page as string),
        parseInt(limit as string)
      );

      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getTrendingSkills = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { limit = 10 } = req.query;
      const skills = await this.usersService.getTrendingSkills(
        parseInt(limit as string)
      );
      successResponse(res, skills);
    } catch (error) {
      next(error);
    }
  };
}
