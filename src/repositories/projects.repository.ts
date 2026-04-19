import type { IProject } from '../models/Project';
import { Project } from '../models/Project';
import type { ICollaborationRequest } from '../models/CollaborationRequest';
import { CollaborationRequest } from '../models/CollaborationRequest';
import type { IProjectInvitation } from '../models/ProjectInvitation';
import { ProjectInvitation } from '../models/ProjectInvitation';
import mongoose from 'mongoose';

export class ProjectsRepository {
  async createProject(data: {
    title: string;
    description: string;
    techStack: string[];
    openRoles: string[];
    owner: string;
  }): Promise<IProject> {
    const project = await Project.create({
      ...data,
      members: [{ user: data.owner, joinedAt: new Date() }],
    });
    return project;
  }

  async findProjects(
    filter: Record<string, unknown>,
    skip: number,
    limit: number
  ): Promise<{ projects: IProject[]; total: number }> {
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('owner', 'firstName lastName avatarUrl')
        .populate('members.user', 'firstName lastName avatarUrl skills')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Project.countDocuments(filter),
    ]);

    return { projects, total };
  }

  async findProjectById(projectId: string): Promise<IProject | null> {
    return await Project.findById(projectId)
      .populate('owner', 'firstName lastName avatarUrl email')
      .populate('members.user', 'firstName lastName avatarUrl skills email');
  }

  async updateProject(
    projectId: string,
    data: Partial<IProject>
  ): Promise<IProject | null> {
    return await Project.findByIdAndUpdate(projectId, data, {
      new: true,
      runValidators: true,
    })
      .populate('owner', 'firstName lastName avatarUrl')
      .populate('members.user', 'firstName lastName avatarUrl skills');
  }

  async deleteProject(projectId: string): Promise<void> {
    await Project.findByIdAndDelete(projectId);
  }

  async addMember(projectId: string, userId: string): Promise<IProject | null> {
    return await Project.findByIdAndUpdate(
      projectId,
      {
        $push: {
          members: {
            user: userId,
            joinedAt: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate('owner', 'firstName lastName avatarUrl')
      .populate('members.user', 'firstName lastName avatarUrl skills');
  }

  async removeMember(projectId: string, userId: string): Promise<IProject | null> {
    return await Project.findByIdAndUpdate(
      projectId,
      {
        $pull: {
          members: { user: new mongoose.Types.ObjectId(userId) },
        },
      },
      { new: true }
    )
      .populate('owner', 'firstName lastName avatarUrl')
      .populate('members.user', 'firstName lastName avatarUrl skills');
  }

  // Collaboration Requests
  async createCollaborationRequest(data: {
    project: string;
    user: string;
    role: string;
    message: string;
  }): Promise<ICollaborationRequest> {
    return await CollaborationRequest.create(data);
  }

  async findCollaborationRequest(
    projectId: string,
    userId: string
  ): Promise<ICollaborationRequest | null> {
    return await CollaborationRequest.findOne({
      project: projectId,
      user: userId,
    });
  }

  async findCollaborationRequestById(
    requestId: string
  ): Promise<ICollaborationRequest | null> {
    return await CollaborationRequest.findById(requestId)
      .populate('user', 'firstName lastName avatarUrl email skills')
      .populate('project', 'title description owner');
  }

  async updateCollaborationRequest(
    requestId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ): Promise<ICollaborationRequest | null> {
    return await CollaborationRequest.findByIdAndUpdate(
      requestId,
      { status },
      { new: true }
    );
  }

  async getProjectCollaborationRequests(
    projectId: string
  ): Promise<ICollaborationRequest[]> {
    return await CollaborationRequest.find({
      project: projectId,
      status: 'PENDING',
    }).populate('user', 'firstName lastName avatarUrl email skills');
  }

  async getUserCollaborationRequests(
    userId: string
  ): Promise<ICollaborationRequest[]> {
    return await CollaborationRequest.find({
      user: userId,
    });
  }

  // Project Invitations
  async createInvitation(data: {
    project: string;
    user: string;
    role: string;
  }): Promise<IProjectInvitation> {
    return await ProjectInvitation.create(data);
  }

  async findInvitation(
    projectId: string,
    userId: string
  ): Promise<IProjectInvitation | null> {
    return await ProjectInvitation.findOne({
      project: projectId,
      user: userId,
    });
  }

  async findInvitationById(
    invitationId: string
  ): Promise<IProjectInvitation | null> {
    return await ProjectInvitation.findById(invitationId)
      .populate('user', 'firstName lastName avatarUrl email')
      .populate('project', 'title description owner');
  }

  async getUserInvitations(userId: string): Promise<IProjectInvitation[]> {
    return await ProjectInvitation.find({
      user: userId,
      status: 'PENDING',
    }).populate({
      path: 'project',
      select: 'title description owner',
      populate: {
        path: 'owner',
        select: 'firstName lastName avatarUrl',
      },
    });
  }

  async updateInvitation(
    invitationId: string,
    status: 'ACCEPTED' | 'DECLINED'
  ): Promise<IProjectInvitation | null> {
    return await ProjectInvitation.findByIdAndUpdate(
      invitationId,
      { status },
      { new: true }
    );
  }
}
