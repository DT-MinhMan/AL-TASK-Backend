import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { AttachmentsService, CreateAttachmentDto } from '../services/attachments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List attachments for a task or page' })
  async findByTarget(
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
  ) {
    return this.attachmentsService.findByTarget(targetType, targetId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment by ID' })
  async findById(@Param('id') id: string) {
    return this.attachmentsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Upload an attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        targetType: {
          type: 'string',
          enum: ['task', 'page'],
        },
        targetId: {
          type: 'string',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!targetType || !['task', 'page'].includes(targetType)) {
      throw new BadRequestException('targetType must be "task" or "page"');
    }

    if (!targetId) {
      throw new BadRequestException('targetId is required');
    }

    const dto: CreateAttachmentDto = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      targetType: targetType as 'task' | 'page',
      targetId,
    };

    return this.attachmentsService.create(dto, file, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an attachment' })
  async delete(@Param('id') id: string) {
    await this.attachmentsService.delete(id);
    return { message: 'Attachment deleted successfully' };
  }

  @Post(':id/download')
  @ApiOperation({ summary: 'Increment download count for an attachment' })
  async incrementDownloadCount(@Param('id') id: string) {
    return this.attachmentsService.incrementDownloadCount(id);
  }
}
