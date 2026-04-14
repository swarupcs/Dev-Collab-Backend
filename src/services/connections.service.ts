import { ConnectionsRepository } from '../repositories/connections.repository';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../utils/errors';

export class ConnectionsService {
  private connectionsRepository: ConnectionsRepository;

  constructor() {
    this.connectionsRepository = new ConnectionsRepository();
  }

  async sendConnectionRequest(
    senderId: string,
    receiverId: string
  ): Promise<any> {
    if (senderId === receiverId) {
      throw new BadRequestError('You cannot connect with yourself');
    }

    // Check if connection already exists
    const existing = await this.connectionsRepository.findConnection(
      senderId,
      receiverId
    );

    if (existing) {
      if (existing.status === 'PENDING') {
        throw new ConflictError('Connection request already pending');
      } else if (existing.status === 'ACCEPTED') {
        throw new ConflictError('You are already connected');
      } else {
        // If rejected, allow sending a new request
        await this.connectionsRepository.deleteConnection(existing._id.toString());
      }
    }

    const connection = await this.connectionsRepository.createConnection(
      senderId,
      receiverId
    );

    // Populate and return
    const populated = await this.connectionsRepository.findConnectionById(
      connection._id.toString()
    );

    return populated!.toJSON();
  }

  async acceptConnectionRequest(
    connectionId: string,
    userId: string
  ): Promise<any> {
    const connection = await this.connectionsRepository.findConnectionById(
      connectionId
    );

    if (!connection) {
      throw new NotFoundError('Connection request not found');
    }

    if (connection.receiver.toString() !== userId) {
      throw new ForbiddenError('You can only accept requests sent to you');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestError('Connection request is not pending');
    }

    const updated = await this.connectionsRepository.updateConnectionStatus(
      connectionId,
      'ACCEPTED'
    );

    return updated!.toJSON();
  }

  async rejectConnectionRequest(
    connectionId: string,
    userId: string
  ): Promise<void> {
    const connection = await this.connectionsRepository.findConnectionById(
      connectionId
    );

    if (!connection) {
      throw new NotFoundError('Connection request not found');
    }

    if (connection.receiver.toString() !== userId) {
      throw new ForbiddenError('You can only reject requests sent to you');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestError('Connection request is not pending');
    }

    await this.connectionsRepository.updateConnectionStatus(
      connectionId,
      'REJECTED'
    );
  }

  async getPendingRequests(userId: string): Promise<any[]> {
    const requests = await this.connectionsRepository.getPendingRequests(userId);
    return requests.map((r) => r.toJSON());
  }

  async getConnections(userId: string): Promise<any[]> {
    const connections = await this.connectionsRepository.getConnections(userId);
    return connections.map((c) => c.toJSON());
  }

  async removeConnection(
    connectionId: string,
    userId: string
  ): Promise<void> {
    const connection = await this.connectionsRepository.findConnectionById(
      connectionId
    );

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // User must be either sender or receiver
    if (
      connection.sender.toString() !== userId &&
      connection.receiver.toString() !== userId
    ) {
      throw new ForbiddenError('You can only remove your own connections');
    }

    await this.connectionsRepository.deleteConnection(connectionId);
  }
}
