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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PostPropertyService } from '../services/post-property.service';
import { CreatePropertyPostDto } from '../dtos/create-property-post.dto';
import { UpdatePropertyPostDto } from '../dtos/update-property-post.dto';
import { FilterPropertyPostDto } from '../dtos/filter-property-post.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Property Posts')
@Controller('propertyapi')
export class PostPropertyController {
  constructor(private readonly postPropertyService: PostPropertyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all property posts with filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated property posts' })
  async findAll(@Query() filterDto: FilterPropertyPostDto) {
    return this.postPropertyService.findAll(filterDto);
  }

  @Get('approved')
  @ApiOperation({ summary: 'Get all approved public property posts' })
  @ApiResponse({ status: 200, description: 'Returns paginated approved property posts' })
  async findApproved(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.postPropertyService.findApproved(page, limit);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending property posts (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated pending property posts' })
  async findPending(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.postPropertyService.findPending(page, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search property posts by keyword' })
  @ApiResponse({ status: 200, description: 'Returns search results' })
  async search(
    @Query('keyword') keyword: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.postPropertyService.search(keyword, page, limit);
  }

  @Get('author/:authorId')
  @ApiOperation({ summary: 'Get property posts by author' })
  @ApiResponse({ status: 200, description: 'Returns paginated author property posts' })
  async findByAuthor(
    @Param('authorId') authorId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.postPropertyService.findByAuthor(authorId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property post by ID' })
  @ApiParam({ name: 'id', description: 'Property post ID' })
  @ApiResponse({ status: 200, description: 'Returns a single property post' })
  @ApiResponse({ status: 404, description: 'Property post not found' })
  async findById(@Param('id') id: string) {
    return this.postPropertyService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get property post by slug' })
  @ApiParam({ name: 'slug', description: 'Property post slug' })
  @ApiResponse({ status: 200, description: 'Returns a single property post' })
  @ApiResponse({ status: 404, description: 'Property post not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.postPropertyService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new property post' })
  @ApiResponse({ status: 201, description: 'Property post created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async create(
    @Body() createDto: CreatePropertyPostDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.postPropertyService.create(createDto, req.user.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a property post' })
  @ApiParam({ name: 'id', description: 'Property post ID' })
  @ApiResponse({ status: 200, description: 'Property post updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Property post not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePropertyPostDto,
  ) {
    return this.postPropertyService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a property post' })
  @ApiParam({ name: 'id', description: 'Property post ID' })
  @ApiResponse({ status: 200, description: 'Property post deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Property post not found' })
  async delete(@Param('id') id: string) {
    const result = await this.postPropertyService.delete(id);
    return { success: result, message: 'Property post deleted successfully' };
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a property post (admin only)' })
  @ApiParam({ name: 'id', description: 'Property post ID' })
  @ApiResponse({ status: 200, description: 'Property post approved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Property post not found' })
  async approve(@Param('id') id: string) {
    return this.postPropertyService.approve(id);
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a property post (admin only)' })
  @ApiParam({ name: 'id', description: 'Property post ID' })
  @ApiResponse({ status: 200, description: 'Property post rejected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Property post not found' })
  async reject(@Param('id') id: string) {
    return this.postPropertyService.reject(id);
  }

  @Put(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment view count for a property post' })
  @ApiParam({ name: 'id', description: 'Property post ID' })
  @ApiResponse({ status: 200, description: 'View count incremented' })
  @ApiResponse({ status: 404, description: 'Property post not found' })
  async incrementViewCount(@Param('id') id: string) {
    return this.postPropertyService.incrementViewCount(id);
  }
}
