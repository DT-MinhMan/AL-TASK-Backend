import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attachment, AttachmentDocument } from '../schemas/attachment.schema';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateAttachmentDto {
  originalName: string;
  mimeType: string;
  size: number;
  targetType: 'task' | 'page';
  targetId: string;
}

export interface AttachmentFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly uploadsDir = './uploads';

  constructor(
    @InjectModel(Attachment.name) private attachmentModel: Model<AttachmentDocument>,
  ) {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async create(dto: CreateAttachmentDto, file?: AttachmentFile, userId?: string): Promise<Attachment> {
    this.logger.log(`Creating attachment for ${dto.targetType}:${dto.targetId}`);

    let filename: string;
    let url: string;

    if (file) {
      filename = file.filename;
      url = `/uploads/${filename}`;
    } else {
      // Generate a unique filename if no file uploaded
      filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      url = `/uploads/${filename}`;
    }

    const attachment = new this.attachmentModel({
      uploadedBy: userId ? new Types.ObjectId(userId) : undefined,
      filename,
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      size: dto.size,
      url,
      targetType: dto.targetType,
      targetId: dto.targetId,
      downloadCount: 0,
    });

    return attachment.save();
  }

  async findById(id: string): Promise<Attachment> {
    this.logger.log(`Finding attachment by id: ${id}`);

    const attachment = await this.attachmentModel.findById(id).exec();

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    return attachment;
  }

  async findByTarget(targetType: string, targetId: string): Promise<Attachment[]> {
    this.logger.log(`Finding attachments for ${targetType}:${targetId}`);

    return this.attachmentModel
      .find({ targetType, targetId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    this.logger.log(`Deleting attachment: ${id}`);

    const attachment = await this.findById(id);

    // Delete the actual file from disk
    const filePath = path.join(this.uploadsDir, attachment.filename);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${filePath}`, error);
    }

    // Delete the database record
    await this.attachmentModel.findByIdAndDelete(id).exec();

    return true;
  }

  async incrementDownloadCount(id: string): Promise<Attachment> {
    this.logger.log(`Incrementing download count for attachment: ${id}`);

    const attachment = await this.attachmentModel
      .findByIdAndUpdate(
        id,
        { $inc: { downloadCount: 1 } },
        { new: true },
      )
      .exec();

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    return attachment;
  }
}
