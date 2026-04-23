import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Space, SpaceDocument } from '../schemas/space.schema';
import { CreateSpaceDto, UpdateSpaceDto } from '../dtos/create-space.dto';

@Injectable()
export class SpacesService {
  private readonly logger = new Logger(SpacesService.name);

  constructor(
    @InjectModel(Space.name) private spaceModel: Model<SpaceDocument>,
  ) {}

  async create(createSpaceDto: CreateSpaceDto, ownerId: string, workspaceId: string): Promise<SpaceDocument> {
    const key = await this.generateUniqueKey(createSpaceDto.key);

    const space = new this.spaceModel({
      ...createSpaceDto,
      key,
      ownerId: new Types.ObjectId(ownerId),
      workspaceId: new Types.ObjectId(workspaceId),
      members: [],
      settings: {},
    });

    const saved = await space.save();
    this.logger.log(`Space created: ${saved._id} with key: ${key}`);
    return saved;
  }

  async findById(id: string): Promise<SpaceDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid space ID');
    }

    const space = await this.spaceModel.findById(id).exec();
    if (!space) {
      throw new NotFoundException(`Space with ID ${id} not found`);
    }
    return space;
  }

  async findByWorkspace(workspaceId: string): Promise<SpaceDocument[]> {
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID');
    }

    return this.spaceModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .exec();
  }

  async findByUserId(userId: string): Promise<SpaceDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userObjectId = new Types.ObjectId(userId);

    return this.spaceModel
      .find({
        $or: [
          { ownerId: userObjectId },
          { 'members.userId': userObjectId },
        ],
      })
      .exec();
  }

  async update(id: string, updateSpaceDto: UpdateSpaceDto): Promise<SpaceDocument> {
    const space = await this.findById(id);

    if (updateSpaceDto.name !== undefined) {
      space.name = updateSpaceDto.name;
    }
    if (updateSpaceDto.description !== undefined) {
      space.description = updateSpaceDto.description;
    }
    if (updateSpaceDto.type !== undefined) {
      space.type = updateSpaceDto.type;
    }
    if (updateSpaceDto.settings !== undefined) {
      space.settings = { ...space.settings, ...updateSpaceDto.settings };
    }

    const updated = await space.save();
    this.logger.log(`Space updated: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.spaceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Space with ID ${id} not found`);
    }
    this.logger.log(`Space deleted: ${id}`);
  }

  async addMember(spaceId: string, userId: string, role: string = 'member'): Promise<SpaceDocument> {
    if (!Types.ObjectId.isValid(spaceId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID format');
    }

    const space = await this.findById(spaceId);
    const targetUserId = new Types.ObjectId(userId);

    const existingMember = space.members.find(
      (m) => m.userId.toString() === targetUserId.toString()
    );

    if (existingMember) {
      existingMember.role = role;
    } else {
      space.members.push({ userId: targetUserId, role });
    }

    const updated = await space.save();
    this.logger.log(`Member ${userId} ${existingMember ? 'updated' : 'added'} to space ${spaceId}`);
    return updated;
  }

  async removeMember(spaceId: string, userId: string): Promise<SpaceDocument> {
    if (!Types.ObjectId.isValid(spaceId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid ID format');
    }

    const space = await this.findById(spaceId);
    const targetUserId = new Types.ObjectId(userId);

    const memberIndex = space.members.findIndex(
      (m) => m.userId.toString() === targetUserId.toString()
    );

    if (memberIndex === -1) {
      throw new NotFoundException(`User ${userId} is not a member of this space`);
    }

    space.members.splice(memberIndex, 1);
    const updated = await space.save();
    this.logger.log(`Member ${userId} removed from space ${spaceId}`);
    return updated;
  }

  async getMembers(spaceId: string): Promise<{ userId: string; role: string }[]> {
    const space = await this.findById(spaceId);
    return space.members.map((m) => ({
      userId: m.userId.toString(),
      role: m.role,
    }));
  }

  async isMember(spaceId: string, userId: string): Promise<boolean> {
    const space = await this.findById(spaceId);
    const targetUserId = new Types.ObjectId(userId);

    if (space.ownerId.toString() === targetUserId.toString()) {
      return true;
    }

    return space.members.some(
      (m) => m.userId.toString() === targetUserId.toString()
    );
  }

  async isAdmin(spaceId: string, userId: string): Promise<boolean> {
    const space = await this.findById(spaceId);
    const targetUserId = new Types.ObjectId(userId);

    if (space.ownerId.toString() === targetUserId.toString()) {
      return true;
    }

    return space.members.some(
      (m) =>
        m.userId.toString() === targetUserId.toString() &&
        m.role === 'admin'
    );
  }

  async isOwner(spaceId: string, userId: string): Promise<boolean> {
    const space = await this.findById(spaceId);
    return space.ownerId.toString() === new Types.ObjectId(userId).toString();
  }

  async generateUniqueKey(key: string): Promise<string> {
    const baseKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let uniqueKey = baseKey;
    let counter = 1;

    while (await this.spaceModel.findOne({ key: uniqueKey })) {
      uniqueKey = `${baseKey}${counter}`;
      counter++;

      if (counter > 1000) {
        throw new BadRequestException('Unable to generate unique key');
      }
    }

    return uniqueKey;
  }
}
