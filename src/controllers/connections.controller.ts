import type { Response, NextFunction } from 'express';
import { ConnectionsService } from '../services/connections.service';
import { successResponse } from '../utils/response';
import type { AuthRequest } from '../middlewares/auth.middleware';

export class ConnectionsController {
  private connectionsService: ConnectionsService;

  constructor() {
    this.connectionsService = new ConnectionsService();
  }

  sendRequest = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) throw new Error('User ID not found');
      const targetUserId = String(req.params.userId);
      const connection = await this.connectionsService.sendConnectionRequest(
        req.userId,
        targetUserId
      );
      successResponse(res, connection, 'Connection request sent', 201);
    } catch (error) {
      next(error);
    }
  };

  acceptRequest = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) throw new Error('User ID not found');
      const connectionId = String(req.params.connectionId);
      const connection = await this.connectionsService.acceptConnectionRequest(
        connectionId,
        req.userId
      );
      successResponse(res, connection, 'Connection request accepted');
    } catch (error) {
      next(error);
    }
  };

  rejectRequest = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) throw new Error('User ID not found');
      const connectionId = String(req.params.connectionId);
      await this.connectionsService.rejectConnectionRequest(
        connectionId,
        req.userId
      );
      successResponse(res, null, 'Connection request rejected');
    } catch (error) {
      next(error);
    }
  };

  getPendingRequests = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) throw new Error('User ID not found');
      const requests = await this.connectionsService.getPendingRequests(
        req.userId
      );
      successResponse(res, requests);
    } catch (error) {
      next(error);
    }
  };

  getConnections = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) throw new Error('User ID not found');
      const connections = await this.connectionsService.getConnections(
        req.userId
      );
      successResponse(res, connections);
    } catch (error) {
      next(error);
    }
  };

  removeConnection = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.userId) throw new Error('User ID not found');
      const connectionId = String(req.params.connectionId);
      await this.connectionsService.removeConnection(
        connectionId,
        req.userId
      );
      successResponse(res, null, 'Connection removed');
    } catch (error) {
      next(error);
    }
  };
}
