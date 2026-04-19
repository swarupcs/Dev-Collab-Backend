import type { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { successResponse } from '../utils/response';
import type { AuthRequest } from '../middlewares/auth.middleware';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password, firstName, lastName } = req.body as Record<string, string>;

      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
      });

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      successResponse(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        'User registered successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body as Record<string, string>;

      const result = await this.authService.login(email, password);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      successResponse(res, {
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const refreshToken = req.cookies.refreshToken as string | undefined;

      if (!refreshToken) {
        return next(new Error('No refresh token provided'));
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      successResponse(res, { accessToken: result.accessToken });
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const refreshToken = req.cookies.refreshToken as string | undefined;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      res.clearCookie('refreshToken');

      successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  };

  logoutAll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) {
        throw new Error('User ID not found');
      }
      await this.authService.logoutAll(req.userId);

      res.clearCookie('refreshToken');

      successResponse(res, null, 'Logged out from all devices');
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) {
        throw new Error('User ID not found');
      }
      const user = await this.authService.getCurrentUser(req.userId);

      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { oldPassword, newPassword } = req.body as Record<string, string>;

      if (!req.userId) {
        throw new Error('User ID not found');
      }
      await this.authService.changePassword(
        req.userId,
        oldPassword,
        newPassword
      );

      successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };
}
