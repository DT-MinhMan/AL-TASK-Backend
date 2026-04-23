import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PagesService } from '../services/pages.service';
import { CreatePageDto, UpdatePageDto, FilterPageDto, MovePageDto, UpdateLabelsDto } from '../dtos/create-page.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new page' })
  async create(@Body() dto: CreatePageDto, @Request() req: any) {
    return this.pagesService.create(dto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List pages with filters and pagination' })
  async findAll(@Query() filter: FilterPageDto) {
    return this.pagesService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get page by ID' })
  async findById(@Param('id') id: string) {
    return this.pagesService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get page by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a page' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
    @Request() req: any,
  ) {
    return this.pagesService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a page and all its children' })
  async delete(@Param('id') id: string) {
    await this.pagesService.delete(id);
    return { message: 'Page and children deleted successfully' };
  }

  @Get('space/:spaceId')
  @ApiOperation({ summary: 'Get all pages in a space' })
  async findBySpace(@Param('spaceId') spaceId: string) {
    return this.pagesService.findBySpace(spaceId);
  }

  @Get('space/:spaceId/root')
  @ApiOperation({ summary: 'Get root pages (no parent) in a space' })
  async findRootPages(@Param('spaceId') spaceId: string) {
    return this.pagesService.findRootPages(spaceId);
  }

  @Get('parent/:parentId')
  @ApiOperation({ summary: 'Get child pages of a parent' })
  async findChildren(@Param('parentId') parentId: string) {
    return this.pagesService.findChildren(parentId);
  }

  @Get('author/:authorId')
  @ApiOperation({ summary: 'Get pages by author' })
  async findByAuthor(@Param('authorId') authorId: string) {
    return this.pagesService.findByAuthor(authorId);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move page to a new parent' })
  async moveToParent(
    @Param('id') id: string,
    @Body() dto: MovePageDto,
  ) {
    return this.pagesService.moveToParent(id, dto.parentId || null);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a page' })
  async publish(@Param('id') id: string) {
    return this.pagesService.publish(id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a page (set to draft)' })
  async unpublish(@Param('id') id: string) {
    return this.pagesService.unpublish(id);
  }

  @Put(':id/labels')
  @ApiOperation({ summary: 'Update page labels' })
  async updateLabels(
    @Param('id') id: string,
    @Body() dto: UpdateLabelsDto,
  ) {
    return this.pagesService.update(id, { labels: dto.labels }, 'system');
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Increment page view count' })
  async incrementViewCount(@Param('id') id: string) {
    return this.pagesService.incrementViewCount(id);
  }
}
