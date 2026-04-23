import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto, UpdateMemberDto } from '../dtos/create-project.dto';
import { WorkflowsService } from '../../workflows/services/workflows.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<Project> {
    this.logger.log(`Creating project: ${createProjectDto.name} with key: ${createProjectDto.key}`);

    const key = createProjectDto.key.toUpperCase();
    const uniqueKey = await this.generateUniqueKey(key);

    const project = new this.projectModel({
      ...createProjectDto,
      key: uniqueKey,
      leadId: new Types.ObjectId(userId),
      members: [
        { userId: new Types.ObjectId(userId), role: 'lead' },
      ],
    });

    try {
      const saved = await project.save();
      this.logger.log(`Project created with id: ${saved._id}`);

      try {
        await this.workflowsService.createDefaultWorkflow(saved._id.toString());
        this.logger.log(`Default workflow created for project ${saved._id}`);
      } catch (wfError) {
        if (wfError instanceof ConflictException) {
          this.logger.warn(`Workflow already exists for project ${saved._id}, skipping creation`);
        } else {
          this.logger.error(`Failed to create default workflow for project ${saved._id}`, wfError);
        }
      }

      return saved;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(`Project key '${uniqueKey}' already exists`);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Project> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async findByWorkspace(workspaceId: string): Promise<Project[]> {
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID');
    }

    return this.projectModel.find({ workspaceId: new Types.ObjectId(workspaceId) }).exec();
  }

  async findByUserId(userId: string): Promise<Project[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.projectModel.find({
      'members.userId': new Types.ObjectId(userId),
    }).exec();
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findById(id);

    if (dto.leadId) {
      (project as any).leadId = dto.leadId;
    }

    Object.assign(project, dto);
    return (project as any).save();
  }

  async delete(id: string): Promise<void> {
    const result = await this.projectModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    this.logger.log(`Project ${id} deleted`);
  }

  async addMember(projectId: string, addMemberDto: AddMemberDto): Promise<Project> {
    const project = await this.findById(projectId);

    const existingMember = project.members.find(
      (m) => m.userId.toString() === addMemberDto.userId
    );

    if (existingMember) {
      throw new ConflictException('User is already a member of this project');
    }

    project.members.push({
      userId: new Types.ObjectId(addMemberDto.userId),
      role: addMemberDto.role,
    });

    return (project as any).save();
  }

  async removeMember(projectId: string, userId: string): Promise<Project> {
    const project = await this.findById(projectId);

    const memberIndex = project.members.findIndex(
      (m) => m.userId.toString() === userId
    );

    if (memberIndex === -1) {
      throw new NotFoundException('Member not found in this project');
    }

    const member = project.members[memberIndex];
    if (member.role === 'lead') {
      throw new ForbiddenException('Cannot remove the project lead');
    }

    project.members.splice(memberIndex, 1);
    return (project as any).save();
  }

  async updateMemberRole(projectId: string, userId: string, updateMemberDto: UpdateMemberDto): Promise<Project> {
    const project = await this.findById(projectId);

    const member = project.members.find(
      (m) => m.userId.toString() === userId
    );

    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    if (member.role === 'lead') {
      throw new ForbiddenException('Cannot change the role of the project lead');
    }

    member.role = updateMemberDto.role;
    return (project as any).save();
  }

  async getMembers(projectId: string): Promise<{ userId: Types.ObjectId; role: string }[]> {
    const project = await this.findById(projectId);
    return project.members;
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(userId)) {
      return false;
    }

    const project = await this.projectModel.findOne({
      _id: new Types.ObjectId(projectId),
      'members.userId': new Types.ObjectId(userId),
    }).exec();

    return !!project;
  }

  async isLeadOrAdmin(projectId: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(userId)) {
      return false;
    }

    const project = await this.projectModel.findOne({
      _id: new Types.ObjectId(projectId),
      members: {
        $elemMatch: {
          userId: new Types.ObjectId(userId),
          role: { $in: ['lead', 'admin'] },
        },
      },
    }).exec();

    return !!project;
  }

  async generateUniqueKey(key: string): Promise<string> {
    const normalizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let uniqueKey = normalizedKey;
    let counter = 1;

    while (await this.projectModel.findOne({ key: uniqueKey }).exec()) {
      const suffix = counter.toString();
      const baseLength = normalizedKey.length;
      const maxBaseLength = 10 - suffix.length;
      const truncatedBase = normalizedKey.slice(0, Math.min(baseLength, maxBaseLength));
      uniqueKey = truncatedBase + suffix;
      counter++;

      if (counter > 1000) {
        throw new ConflictException('Unable to generate unique project key');
      }
    }

    return uniqueKey;
  }
}
