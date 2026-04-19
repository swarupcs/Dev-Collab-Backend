/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
  ): Promise<Record<string, unknown>> {
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

    if (!populated) {
      throw new NotFoundError('Connection not found after creation');
    }

    return populated.toJSON() as Record<string, unknown>;
  }

  async acceptConnectionRequest(
    connectionId: string,
    userId: string
  ): Promise<Record<string, unknown>> {
    const connection = await this.connectionsRepository.findConnectionById(
      connectionId
    );

    if (!connection) {
      throw new NotFoundError('Connection request not found');
    }

    const receiverIdStr = connection.receiver && typeof connection.receiver === 'object' && '_id' in connection.receiver
      ? String((connection.receiver as any)._id)
      : String(connection.receiver);

    if (receiverIdStr !== userId) {
      throw new ForbiddenError('You can only accept requests sent to you');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestError('Connection request is not pending');
    }

    const updated = await this.connectionsRepository.updateConnectionStatus(
      connectionId,
      'ACCEPTED'
    );

    if (!updated) {
      throw new NotFoundError('Connection not found after update');
    }

    return updated.toJSON() as Record<string, unknown>;
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

    const receiverIdStr = connection.receiver && typeof connection.receiver === 'object' && '_id' in connection.receiver
      ? String((connection.receiver as any)._id)
      : String(connection.receiver);

    if (receiverIdStr !== userId) {
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

  async getPendingRequests(userId: string): Promise<Record<string, unknown>[]> {
    const requests = await this.connectionsRepository.getPendingRequests(userId);
    return requests.map((r) => r.toJSON() as Record<string, unknown>);
  }

  async getConnections(userId: string): Promise<Record<string, unknown>[]> {
    const connections = await this.connectionsRepository.getConnections(userId);
    return connections.map((c) => c.toJSON() as Record<string, unknown>);
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

    const senderIdStr = connection.sender && typeof connection.sender === 'object' && '_id' in connection.sender
      ? String((connection.sender as any)._id)
      : String(connection.sender);
    const receiverIdStr = connection.receiver && typeof connection.receiver === 'object' && '_id' in connection.receiver
      ? String((connection.receiver as any)._id)
      : String(connection.receiver);

    // User must be either sender or receiver
    if (
      senderIdStr !== userId &&
      receiverIdStr !== userId
    ) {
      throw new ForbiddenError('You can only remove your own connections');
    }

    await this.connectionsRepository.deleteConnection(connectionId);
  }
}
