import { Response, NextFunction } from 'express';
import { ProjectsService } from '../services/projects.service';
import { successResponse } from '../utils/response';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ProjectsController {
  private projectsService: ProjectsService;

  constructor() {
    this.projectsService = new ProjectsService();
  }

  createProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const project = await this.projectsService.createProject(
        req.userId!,
        req.body
      );
      successResponse(res, project, 'Project created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getProjects = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { status, ownership, search, page, limit } = req.query;

      const result = await this.projectsService.getProjects({
        status: status as any,
        ownership: ownership as any,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        userId: req.userId,
      });

      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getProjectById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const project = await this.projectsService.getProjectById(
        req.params.projectId
      );
      successResponse(res, project);
    } catch (error) {
      next(error);
    }
  };

  updateProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const project = await this.projectsService.updateProject(
        req.params.projectId,
        req.userId!,
        req.body
      );
      successResponse(res, project, 'Project updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.projectsService.deleteProject(req.params.projectId, req.userId!);
      successResponse(res, null, 'Project deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  applyToProject = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const request = await this.projectsService.applyToProject(
        req.params.projectId,
        req.userId!,
        req.body
      );
      successResponse(res, request, 'Application submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  respondToCollaboration = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { accept } = req.body;
      await this.projectsService.respondToCollaboration(
        req.params.projectId,
        req.params.collaborationId,
        req.userId!,
        accept
      );
      successResponse(
        res,
        null,
        accept ? 'Request accepted' : 'Request rejected'
      );
    } catch (error) {
      next(error);
    }
  };

  inviteUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const invitation = await this.projectsService.inviteUser(
        req.params.projectId,
        req.userId!,
        req.body
      );
      successResponse(res, invitation, 'User invited successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getMyInvitations = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const invitations = await this.projectsService.getMyInvitations(
        req.userId!
      );
      successResponse(res, invitations);
    } catch (error) {
      next(error);
    }
  };

  respondToInvitation = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { accept } = req.body;
      await this.projectsService.respondToInvitation(
        req.params.projectId,
        req.params.invitationId,
        req.userId!,
        accept
      );
      successResponse(
        res,
        null,
        accept ? 'Invitation accepted' : 'Invitation declined'
      );
    } catch (error) {
      next(error);
    }
  };
}
