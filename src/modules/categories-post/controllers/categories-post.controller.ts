import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesPostService } from '../services/categories-post.service';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Categories-Post')
@Controller('categoriespostapi')
export class CategoriesPostController {
  constructor(private readonly categoriesPostService: CategoriesPostService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  findAll() {
    return this.categoriesPostService.findAll();
  }

  @Get('root')
  @ApiOperation({ summary: 'Get root categories' })
  findRootCategories() {
    return this.categoriesPostService.findRootCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  findById(@Param('id') id: string) {
    return this.categoriesPostService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get category by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesPostService.findBySlug(slug);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get children of a category' })
  findByParent(@Param('id') id: string) {
    return this.categoriesPostService.findByParent(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get all descendants of a category' })
  findDescendants(@Param('id') id: string) {
    return this.categoriesPostService.findDescendants(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (admin only)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesPostService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesPostService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (admin only)' })
  delete(@Param('id') id: string) {
    return this.categoriesPostService.delete(id);
  }
}
