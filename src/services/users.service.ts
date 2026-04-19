/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UsersRepository } from '../repositories/users.repository';
import { NotFoundError } from '../utils/errors';


export class UsersService {
  private usersRepository: UsersRepository;

  constructor() {
    this.usersRepository = new UsersRepository();
  }

  async getUserProfile(userId: string): Promise<Record<string, unknown>> {
    const user = await this.usersRepository.findUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.toJSON();
  }

  async updateUserProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      location?: string;
      website?: string;
      github?: string;
      twitter?: string;
      skills?: string[];
      avatarUrl?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
    }
  ): Promise<Record<string, unknown>> {
    const user = await this.usersRepository.updateUser(userId, data);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.toJSON();
  }

  async searchUsers(
    query?: string,
    skills?: string[],
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }> {
    const skip = (page - 1) * limit;

    const { users, total } = await this.usersRepository.searchUsers(
      query || '',
      skills,
      skip,
      limit
    );

    return {
      data: users.map((user) => user.toJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTrendingSkills(limit: number = 10): Promise<any[]> {
    return await this.usersRepository.getTrendingSkills(limit);
  }
}
