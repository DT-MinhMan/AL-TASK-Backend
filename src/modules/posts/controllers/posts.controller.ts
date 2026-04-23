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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PostsService } from '../services/posts.service';
import { CreatePostDto } from '../dtos/create-post.dto';
import { UpdatePostDto } from '../dtos/update-post.dto';
import { FilterPostDto } from '../dtos/filter-post.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Posts')
@Controller('postsapi')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all posts with filtering and pagination' })
  @ApiQuery({ name: 'authorId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'pending', 'published', 'rejected'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  async findAll(@Query() filter: FilterPostDto) {
    return this.postsService.findAll(filter);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured posts' })
  @ApiQuery({ name: 'limit', required: false })
  async findFeatured(@Query('limit') limit?: number) {
    return this.postsService.findFeatured(limit ? Number(limit) : 10);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending posts (admin only)' })
  async findPending() {
    return this.postsService.findPending();
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get post by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.postsService.findBySlug(slug);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search posts' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.postsService.search(query, limit ? Number(limit) : 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  async findById(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post' })
  async create(@Body() createPostDto: CreatePostDto, @Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return this.postsService.create(createPostDto, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  async delete(@Param('id') id: string) {
    await this.postsService.delete(id);
    return { message: 'Post deleted successfully' };
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a post (publish it)' })
  async approve(@Param('id') id: string) {
    return this.postsService.approve(id);
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a post' })
  async reject(@Param('id') id: string) {
    return this.postsService.reject(id);
  }

  @Put(':id/view')
  @ApiOperation({ summary: 'Increment view count for a post' })
  async incrementViewCount(@Param('id') id: string) {
    return this.postsService.incrementViewCount(id);
  }
}
