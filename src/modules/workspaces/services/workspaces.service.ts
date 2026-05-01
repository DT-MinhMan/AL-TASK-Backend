import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkspacesRepository } from '../repositories/workspaces.repository';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from '../dtos/create-workspace.dto';
import { WorkflowsService } from '../../workflows/services/workflows.service';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto): Promise<any> {
    const slug = dto.slug || (await this.generateUniqueSlug(dto.name));
    const key = await this.generateUniqueKey(dto.key || dto.name);

    const existingSlug = await this.workspacesRepository.findBySlug(slug);
    if (existingSlug) {
      throw new BadRequestException(`Workspace with slug "${slug}" already exists`);
    }

    const workspace = await this.workspacesRepository.create({
      name: dto.name,
      description: dto.description,
      slug,
      key,
      type: dto.type || 'kanban',
      ownerId: new Types.ObjectId(userId),
      leadId: new Types.ObjectId(userId),
      members: [
        { userId: new Types.ObjectId(userId), role: 'owner' },
      ],
      settings: {},
      status: 'active',
    });

    this.logger.log(`Workspace created: ${workspace._id} by user ${userId}`);

    try {
      await this.workflowsService.createDefaultWorkflow(workspace._id.toString());
      this.logger.log(`Default workflow created for workspace ${workspace._id}`);
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(`Workflow already exists for workspace ${workspace._id}, skipping creation`);
      } else {
        this.logger.error(`Failed to create default workflow for workspace ${workspace._id}`, error);
      }
    }

    return workspace;
  }

  async findAll(): Promise<any[]> {
    return this.workspacesRepository.findAll();
  }

  async findById(id: string): Promise<any> {
    const workspace = await this.workspacesRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${id}" not found`);
    }
    return workspace;
  }

  async findBySlug(slug: string): Promise<any> {
    const workspace = await this.workspacesRepository.findBySlug(slug);
    if (!workspace) {
      throw new NotFoundException(`Workspace with slug "${slug}" not found`);
    }
    return workspace;
  }

  async findByUserId(userId: string): Promise<any[]> {
    return this.workspacesRepository.findByUserId(userId);
  }

  async update(id: string, dto: UpdateWorkspaceDto): Promise<any> {
    const workspace = await this.workspacesRepository.findById(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${id}" not found`);
    }

    if (dto.name) {
      workspace.name = dto.name;
    }
    if (dto.description !== undefined) {
      workspace.description = dto.description;
    }
    if (dto.settings) {
      workspace.settings = { ...workspace.settings, ...dto.settings };
    }
    if (dto.key) {
      workspace.key = await this.generateUniqueKey(dto.key, id);
    }
    if (dto.type) {
      workspace.type = dto.type;
    }
    if (dto.status) {
      workspace.status = dto.status;
    }

    const updated = await this.workspacesRepository.update(id, workspace);
    this.logger.log(`Workspace updated: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.workspacesRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Workspace with ID "${id}" not found`);
    }
    this.logger.log(`Workspace deleted: ${id}`);
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer',
  ): Promise<any> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${workspaceId}" not found`);
    }

    const isAlreadyMember = workspace.members.some(
      (m) => m.userId.toString() === userId,
    );
    if (isAlreadyMember) {
      throw new BadRequestException(`User "${userId}" is already a member`);
    }

    const updated = await this.workspacesRepository.addMember(
      workspaceId,
      userId,
      role,
    );
    this.logger.log(`Member ${userId} added to workspace ${workspaceId} with role ${role}`);
    return updated;
  }

  async removeMember(workspaceId: string, userId: string): Promise<any> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${workspaceId}" not found`);
    }

    const member = workspace.members.find(
      (m) => m.userId.toString() === userId,
    );
    if (!member) {
      throw new NotFoundException(`User "${userId}" is not a member`);
    }

    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot remove the owner from workspace');
    }

    const updated = await this.workspacesRepository.removeMember(workspaceId, userId);
    this.logger.log(`Member ${userId} removed from workspace ${workspaceId}`);
    return updated;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer',
  ): Promise<any> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${workspaceId}" not found`);
    }

    const member = workspace.members.find(
      (m) => m.userId.toString() === userId,
    );
    if (!member) {
      throw new NotFoundException(`User "${userId}" is not a member`);
    }

    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot change the owner role');
    }

    const updated = await this.workspacesRepository.updateMemberRole(
      workspaceId,
      userId,
      role,
    );
    this.logger.log(`Member ${userId} role updated to ${role} in workspace ${workspaceId}`);
    return updated;
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      return false;
    }
    return workspace.members.some((m) => m.userId.toString() === userId);
  }

  async isAdmin(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      return false;
    }
    const member = workspace.members.find(
      (m) => m.userId.toString() === userId,
    );
    return member?.role === 'owner' || member?.role === 'admin';
  }

  async isOwner(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      return false;
    }
    return workspace.ownerId.toString() === userId;
  }

  async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    let slug = baseSlug;
    let counter = 1;

    while (await this.workspacesRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async generateUniqueKey(source: string, currentWorkspaceId?: string): Promise<string> {
    const baseKey =
      source
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10) || 'SPACE';

    let key = baseKey;
    let counter = 1;

    while (true) {
      const existing = await this.workspacesRepository.findByKey(key);
      if (!existing || existing._id.toString() === currentWorkspaceId) {
        return key;
      }

      const suffix = counter.toString();
      key = `${baseKey.substring(0, Math.max(1, 10 - suffix.length))}${suffix}`;
      counter++;

      if (counter > 999) {
        throw new ConflictException('Unable to generate unique workspace key');
      }
    }
  }

  async getMembers(workspaceId: string): Promise<any[]> {
    const workspace = await this.workspacesRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${workspaceId}" not found`);
    }
    return workspace.members;
  }
}
