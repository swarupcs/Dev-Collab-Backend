import { Connection, IConnection } from '../models/Connection';

export class ConnectionsRepository {
  async createConnection(
    senderId: string,
    receiverId: string
  ): Promise<IConnection> {
    return await Connection.create({
      sender: senderId,
      receiver: receiverId,
      status: 'PENDING',
    });
  }

  async findConnection(
    senderId: string,
    receiverId: string
  ): Promise<IConnection | null> {
    return await Connection.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    });
  }

  async findConnectionById(connectionId: string): Promise<IConnection | null> {
    return await Connection.findById(connectionId)
      .populate('sender', 'firstName lastName avatarUrl email skills bio')
      .populate('receiver', 'firstName lastName avatarUrl email skills bio');
  }

  async updateConnectionStatus(
    connectionId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ): Promise<IConnection | null> {
    return await Connection.findByIdAndUpdate(
      connectionId,
      { status },
      { new: true }
    )
      .populate('sender', 'firstName lastName avatarUrl email skills bio')
      .populate('receiver', 'firstName lastName avatarUrl email skills bio');
  }

  async getPendingRequests(userId: string): Promise<IConnection[]> {
    return await Connection.find({
      $or: [{ receiver: userId }, { sender: userId }],
      status: 'PENDING',
    })
      .populate('sender', 'firstName lastName avatarUrl email skills bio')
      .populate('receiver', 'firstName lastName avatarUrl email skills bio');
  }

  async getConnections(userId: string): Promise<IConnection[]> {
    return await Connection.find({
      $or: [
        { sender: userId, status: 'ACCEPTED' },
        { receiver: userId, status: 'ACCEPTED' },
      ],
    })
      .populate('sender', 'firstName lastName avatarUrl email skills bio')
      .populate('receiver', 'firstName lastName avatarUrl email skills bio')
      .sort({ createdAt: -1 });
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await Connection.findByIdAndDelete(connectionId);
  }
}
