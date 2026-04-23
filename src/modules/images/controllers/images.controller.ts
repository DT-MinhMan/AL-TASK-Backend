import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ImagesService } from '../services/images.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateImageDto } from '../dtos/create-image.dto';

const imageFileFilter = (req: any, file: Express.Multer.File, callback: Function) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
    return callback(new Error('Only image files are allowed! (jpg, jpeg, png, gif, webp)'), false);
  }
  callback(null, true);
};

const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const originalName = file.originalname.replace(/\.[^/.]+$/, '');
    const safeName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  },
});

@ApiTags('Images')
@Controller('imagesapi')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload single image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or no file provided' })
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateImageDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    const image = await this.imagesService.create(dto, file, userId);
    return {
      success: true,
      message: 'Image uploaded successfully',
      data: image,
    };
  }

  @Post('upload/multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multiple images (max 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Images uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid files or no files provided' })
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateImageDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    const images = await this.imagesService.createMultiple(files as any, files, userId);
    return {
      success: true,
      message: `${images.length} images uploaded successfully`,
      data: images,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all images with filters' })
  @ApiResponse({ status: 200, description: 'List of images' })
  async findAll(
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const images = await this.imagesService.findAll({
      targetType,
      targetId,
      userId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return {
      success: true,
      ...images,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get image by ID' })
  @ApiResponse({ status: 200, description: 'Image details' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async findById(@Param('id') id: string) {
    const image = await this.imagesService.findById(id);
    return {
      success: true,
      data: image,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete image by ID' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async delete(@Param('id') id: string) {
    const result = await this.imagesService.delete(id);
    return {
      success: result.success,
      message: result.message,
    };
  }

  @Put(':id/view')
  @ApiOperation({ summary: 'Increment image download/view count' })
  @ApiResponse({ status: 200, description: 'Count incremented' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async incrementDownloadCount(@Param('id') id: string) {
    const image = await this.imagesService.incrementDownloadCount(id);
    return {
      success: true,
      data: {
        id: image._id,
        downloadCount: image.downloadCount,
      },
    };
  }
}
