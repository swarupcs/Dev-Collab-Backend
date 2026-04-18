import type { IUser } from '../models/User';
import { User } from '../models/User';
import type { IRefreshToken } from '../models/RefreshToken';
import { RefreshToken } from '../models/RefreshToken';


export class AuthRepository {
  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<IUser> {
    const user = await User.create(userData);
    return user;
  }

  async findUserByEmail(email: string): Promise<IUser | null> {
    const formattedEmail = email.toLowerCase().trim();
    return await User.findOne({ email: formattedEmail }).select('+password');
  }

  async findUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<IRefreshToken> {
    return await RefreshToken.create({
      user: userId,
      token,
      expiresAt,
    });
  }

  async findRefreshToken(token: string): Promise<IRefreshToken | null> {
    return await RefreshToken.findOne({ token }).populate('user');
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await RefreshToken.deleteOne({ token });
  }

  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await RefreshToken.deleteMany({ user: userId });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { password: newPassword });
  }
}
