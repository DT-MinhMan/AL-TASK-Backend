import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Space, SpaceDocument } from '../schemas/space.schema';
import { CreateSpaceDto, UpdateSpaceDto } from '../dtos/create-space.dto';
import { SPACE_ROLES, SpaceRole } from '../../../common/constants/space-role.constants';

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
      members: [{ userId: new Types.ObjectId(ownerId), role: SPACE_ROLES.SPACE_ADMIN }],
      settings: {},
    });

    const saved = await space.save();
    this.logger.log(`Space đã được tạo: ${saved._id} với key: ${key}`);
    return saved;
  }

  async findById(id: string): Promise<SpaceDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Định dạng ID space không hợp lệ');
    }

    const space = await this.spaceModel.findById(id).exec();
    if (!space) {
      throw new NotFoundException(`Không tìm thấy Space với ID ${id}`);
    }
    return space;
  }

  async findByWorkspace(workspaceId: string): Promise<SpaceDocument[]> {
    if (!Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestException('Định dạng ID workspace không hợp lệ');
    }

    return this.spaceModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .exec();
  }

  async findByUserId(userId: string): Promise<SpaceDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Định dạng ID người dùng không hợp lệ');
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
    this.logger.log(`Space đã được cập nhật: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.spaceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Không tìm thấy Space với ID ${id}`);
    }
    this.logger.log(`Space đã được xóa: ${id}`);
  }

  async addMember(spaceId: string, userId: string, role: SpaceRole = SPACE_ROLES.MEMBER): Promise<SpaceDocument> {
    if (!Types.ObjectId.isValid(spaceId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Định dạng ID không hợp lệ');
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
    this.logger.log(`Thành viên ${userId} đã được ${existingMember ? 'cập nhật' : 'thêm'} vào space ${spaceId}`);
    return updated;
  }

  async removeMember(spaceId: string, userId: string): Promise<SpaceDocument> {
    if (!Types.ObjectId.isValid(spaceId) || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Định dạng ID không hợp lệ');
    }

    const space = await this.findById(spaceId);
    const targetUserId = new Types.ObjectId(userId);

    const memberIndex = space.members.findIndex(
      (m) => m.userId.toString() === targetUserId.toString()
    );

    if (memberIndex === -1) {
      throw new NotFoundException(`Người dùng ${userId} không phải là thành viên của space này`);
    }

    space.members.splice(memberIndex, 1);
    const updated = await space.save();
    this.logger.log(`Thành viên ${userId} đã bị xóa khỏi space ${spaceId}`);
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
        m.role === SPACE_ROLES.SPACE_ADMIN
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
        throw new BadRequestException('Không thể tạo key duy nhất');
      }
    }

    return uniqueKey;
  }
}
