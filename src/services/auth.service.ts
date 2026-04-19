import { AuthRepository } from '../repositories/auth.repository';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from '../utils/errors';

export class AuthService {
  private authRepository: AuthRepository;

  constructor() {
    this.authRepository = new AuthRepository();
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }> {
    // Check if user exists
    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await this.authRepository.createUser({
      ...data,
      password: hashedPassword,
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await this.authRepository.createRefreshToken(
      user._id.toString(),
      refreshToken,
      expiresAt
    );

    // Remove password from response
    const userResponse = user.toJSON() as Record<string, unknown>;

    return { user: userResponse, accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }> {
    // Find user
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.authRepository.createRefreshToken(
      user._id.toString(),
      refreshToken,
      expiresAt
    );

    // Remove password from response
    const userResponse = user.toJSON() as Record<string, unknown>;

    return { user: userResponse, accessToken, refreshToken };
  }

  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string }> {
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const tokenDoc = await this.authRepository.findRefreshToken(refreshToken);
    if (!tokenDoc) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
    });

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.authRepository.deleteRefreshToken(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.authRepository.deleteAllUserRefreshTokens(userId);
  }

  async getCurrentUser(userId: string): Promise<Record<string, unknown>> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return user.toJSON() as Record<string, unknown>;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const userToFind = await this.authRepository.findUserById(userId);
    if (!userToFind?.email) {
      throw new UnauthorizedError('User not found');
    }
    const user = await this.authRepository.findUserByEmail(userToFind.email);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify old password
    const isPasswordValid = await comparePassword(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await this.authRepository.updatePassword(userId, hashedPassword);

    // Logout from all devices
    await this.logoutAll(userId);
  }
}
