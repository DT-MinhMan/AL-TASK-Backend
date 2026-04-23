import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sprint, SprintDocument } from '../schemas/sprint.schema';
import { CreateSprintDto, UpdateSprintDto } from '../dtos/create-sprint.dto';

@Injectable()
export class SprintsService {
  private readonly logger = new Logger(SprintsService.name);

  constructor(
    @InjectModel(Sprint.name) private readonly sprintModel: Model<SprintDocument>,
  ) {}

  async create(createSprintDto: CreateSprintDto, projectId: string): Promise<SprintDocument> {
    this.logger.log(`Creating sprint for project: ${projectId}`);
    const sprint = new this.sprintModel({
      ...createSprintDto,
      projectId: new Types.ObjectId(projectId),
    });
    return sprint.save();
  }

  async findAll(): Promise<SprintDocument[]> {
    this.logger.log('Finding all sprints');
    return this.sprintModel.find().exec();
  }

  async findByProject(projectId: string): Promise<SprintDocument[]> {
    this.logger.log(`Finding sprints for project: ${projectId}`);
    return this.sprintModel.find({ projectId: new Types.ObjectId(projectId) }).exec();
  }

  async findOne(id: string): Promise<SprintDocument> {
    this.logger.log(`Finding sprint: ${id}`);
    const sprint = await this.sprintModel.findById(id).exec();
    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${id} not found`);
    }
    return sprint;
  }

  async update(id: string, updateSprintDto: UpdateSprintDto): Promise<SprintDocument> {
    this.logger.log(`Updating sprint: ${id}`);
    const sprint = await this.sprintModel
      .findByIdAndUpdate(id, updateSprintDto, { new: true })
      .exec();
    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${id} not found`);
    }
    return sprint;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting sprint: ${id}`);
    const result = await this.sprintModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Sprint with ID ${id} not found`);
    }
  }

  async findActive(projectId: string): Promise<SprintDocument | null> {
    this.logger.log(`Finding active sprint for project: ${projectId}`);
    return this.sprintModel.findOne({
      projectId: new Types.ObjectId(projectId),
      status: 'active',
    }).exec();
  }

  async findCompleted(projectId: string): Promise<SprintDocument[]> {
    this.logger.log(`Finding completed sprints for project: ${projectId}`);
    return this.sprintModel.find({
      projectId: new Types.ObjectId(projectId),
      status: 'completed',
    }).exec();
  }

  async startSprint(id: string): Promise<SprintDocument> {
    this.logger.log(`Starting sprint: ${id}`);
    const sprint = await this.findOne(id);
    sprint.status = 'active';
    return sprint.save();
  }

  async completeSprint(id: string): Promise<SprintDocument> {
    this.logger.log(`Completing sprint: ${id}`);
    const sprint = await this.findOne(id);
    sprint.status = 'completed';
    return sprint.save();
  }
}
