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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BoardsService } from '../services/boards.service';
import { CreateBoardDto } from '../dtos/create-board.dto';
import { UpdateBoardDto } from '../dtos/update-board.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Boards')
@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all boards or filter by project' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter boards by project ID' })
  @ApiResponse({ status: 200, description: 'Boards retrieved successfully' })
  async findAll(@Query('projectId') projectId?: string) {
    if (projectId) {
      return this.boardsService.findByProject(projectId);
    }
    return this.boardsService.findByProject('');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a board by ID' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async findOne(@Param('id') id: string) {
    return this.boardsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new board' })
  @ApiResponse({ status: 201, description: 'Board created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createBoardDto: CreateBoardDto) {
    return this.boardsService.create(createBoardDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a board' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Board updated successfully' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async update(@Param('id') id: string, @Body() updateBoardDto: UpdateBoardDto) {
    return this.boardsService.update(id, updateBoardDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a board' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 204, description: 'Board deleted successfully' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async delete(@Param('id') id: string) {
    await this.boardsService.delete(id);
  }

  @Put(':id/columns')
  @ApiOperation({ summary: 'Update board columns' })
  @ApiParam({ name: 'id', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Columns updated successfully' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async updateColumns(
    @Param('id') id: string,
    @Body('columns') columns: any[],
  ) {
    return this.boardsService.updateColumns(id, columns);
  }
}
