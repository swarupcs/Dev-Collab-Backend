import { ProjectsRepository } from '../repositories/projects.repository';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors';

export class ProjectsService {
  private projectsRepository: ProjectsRepository;

  constructor() {
    this.projectsRepository = new ProjectsRepository();
  }

  async createProject(
    userId: string,
    data: {
      title: string;
      description: string;
      techStack: string[];
      openRoles?: string[];
    }
  ): Promise<any> {
    const project = await this.projectsRepository.createProject({
      ...data,
      openRoles: data.openRoles || [],
      owner: userId,
    });

    return project.toJSON();
  }

  async getProjects(query: {
    status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
    ownership?: 'mine' | 'member' | 'applied';
    search?: string;
    page?: number;
    limit?: number;
    userId?: string;
  }): Promise<{ projects: any[]; pagination: any }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Status filter
    if (query.status) {
      filter.status = query.status;
    }

    // Ownership filter
    if (query.ownership && query.userId) {
      if (query.ownership === 'mine') {
        filter.owner = query.userId;
      } else if (query.ownership === 'member') {
        filter['members.user'] = query.userId;
      }
    }

    // Search filter
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const { projects, total } = await this.projectsRepository.findProjects(
      filter,
      skip,
      limit
    );

    return {
      projects: projects.map((p) => p.toJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProjectById(projectId: string): Promise<any> {
    const project = await this.projectsRepository.findProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project.toJSON();
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      techStack?: string[];
      openRoles?: string[];
      status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
    }
  ): Promise<any> {
    const project = await this.projectsRepository.findProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner.toString() !== userId) {
      throw new ForbiddenError('Only project owner can update the project');
    }

    const updated = await this.projectsRepository.updateProject(projectId, data);

    return updated!.toJSON();
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await this.projectsRepository.findProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner.toString() !== userId) {
      throw new ForbiddenError('Only project owner can delete the project');
    }

    await this.projectsRepository.deleteProject(projectId);
  }

  async applyToProject(
    projectId: string,
    userId: string,
    data: { role: string; message: string }
  ): Promise<any> {
    const project = await this.projectsRepository.findProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Check if user is already a member
    const isMember = project.members.some(
      (m: any) => m.user.toString() === userId
    );

    if (isMember) {
      throw new ConflictError('You are already a member of this project');
    }

    // Check if already applied
    const existing = await this.projectsRepository.findCollaborationRequest(
      projectId,
      userId
    );

    if (existing) {
      throw new ConflictError('You have already applied to this project');
    }

    const request = await this.projectsRepository.createCollaborationRequest({
      project: projectId,
      user: userId,
      role: data.role,
      message: data.message,
    });

    return request.toJSON();
  }

  async respondToCollaboration(
    projectId: string,
    collaborationId: string,
    userId: string,
    accept: boolean
  ): Promise<void> {
    const project = await this.projectsRepository.findProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner.toString() !== userId) {
      throw new ForbiddenError('Only project owner can respond to requests');
    }

    const request = await this.projectsRepository.findCollaborationRequestById(
      collaborationId
    );

    if (!request) {
      throw new NotFoundError('Collaboration request not found');
    }

    if (accept) {
      await this.projectsRepository.updateCollaborationRequest(
        collaborationId,
        'ACCEPTED'
      );
      await this.projectsRepository.addMember(projectId, request.user.toString());
    } else {
      await this.projectsRepository.updateCollaborationRequest(
        collaborationId,
        'REJECTED'
      );
    }
  }

  async inviteUser(
    projectId: string,
    userId: string,
    data: { userId: string; role: string }
  ): Promise<any> {
    const project = await this.projectsRepository.findProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.owner.toString() !== userId) {
      throw new ForbiddenError('Only project owner can invite users');
    }

    // Check if user is already a member
    const isMember = project.members.some(
      (m: any) => m.user.toString() === data.userId
    );

    if (isMember) {
      throw new ConflictError('User is already a member of this project');
    }

    // Check if already invited
    const existing = await this.projectsRepository.findInvitation(
      projectId,
      data.userId
    );

    if (existing && existing.status === 'PENDING') {
      throw new ConflictError('User has already been invited');
    }

    const invitation = await this.projectsRepository.createInvitation({
      project: projectId,
      user: data.userId,
      role: data.role,
    });

    return invitation.toJSON();
  }

  async getMyInvitations(userId: string): Promise<any[]> {
    const invitations = await this.projectsRepository.getUserInvitations(userId);
    return invitations.map((i) => i.toJSON());
  }

  async respondToInvitation(
    projectId: string,
    invitationId: string,
    userId: string,
    accept: boolean
  ): Promise<void> {
    const invitation = await this.projectsRepository.findInvitationById(
      invitationId
    );

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.user.toString() !== userId) {
      throw new ForbiddenError('This invitation is not for you');
    }

    if (accept) {
      await this.projectsRepository.updateInvitation(invitationId, 'ACCEPTED');
      await this.projectsRepository.addMember(projectId, userId);
    } else {
      await this.projectsRepository.updateInvitation(invitationId, 'DECLINED');
    }
  }
}
