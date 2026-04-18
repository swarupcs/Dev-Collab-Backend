import type { IUser } from '../models/User';
import { User } from '../models/User';


export class UsersRepository {
  async findUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  async updateUser(
    userId: string,
    data: Partial<IUser>
  ): Promise<IUser | null> {
    return await User.findByIdAndUpdate(userId, data, {
      new: true,
      runValidators: true,
    });
  }

  async searchUsers(
    query: string,
    skills?: string[],
    skip: number = 0,
    limit: number = 10
  ): Promise<{ users: IUser[]; total: number }> {
    const filter: any = { visibility: 'PUBLIC' };

    if (query && query.trim() !== '') {
      filter.$or = [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
    }

    if (skills && skills.length > 0) {
      filter.skills = { $in: skills };
    }

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return { users, total };
  }

  async getTrendingSkills(limit: number = 10): Promise<any[]> {
    const result = await User.aggregate([
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          skill: '$_id',
          count: 1,
        },
      },
    ]);

    return result;
  }
}
