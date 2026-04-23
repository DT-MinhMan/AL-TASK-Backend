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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SprintsService } from '../services/sprints.service';
import { CreateSprintDto, UpdateSprintDto } from '../dtos/create-sprint.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Sprints')
@Controller('sprints')
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  @ApiOperation({ summary: 'List all sprints or filter by project' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter sprints by project ID' })
  @ApiResponse({ status: 200, description: 'Returns list of sprints' })
  async findAll(@Query('projectId') projectId?: string) {
    if (projectId) {
      return this.sprintsService.findByProject(projectId);
    }
    return this.sprintsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sprint by ID' })
  @ApiResponse({ status: 200, description: 'Returns the sprint' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async findOne(@Param('id') id: string) {
    return this.sprintsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new sprint' })
  @ApiResponse({ status: 201, description: 'Sprint created successfully' })
  async create(
    @Body() createSprintDto: CreateSprintDto,
    @Query('projectId') projectId: string,
  ) {
    return this.sprintsService.create(createSprintDto, projectId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a sprint' })
  @ApiResponse({ status: 200, description: 'Sprint updated successfully' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async update(
    @Param('id') id: string,
    @Body() updateSprintDto: UpdateSprintDto,
  ) {
    return this.sprintsService.update(id, updateSprintDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sprint' })
  @ApiResponse({ status: 200, description: 'Sprint deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a sprint (set status to active)' })
  @ApiResponse({ status: 200, description: 'Sprint started successfully' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async startSprint(@Param('id') id: string) {
    return this.sprintsService.startSprint(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a sprint (set status to completed)' })
  @ApiResponse({ status: 200, description: 'Sprint completed successfully' })
  @ApiResponse({ status: 404, description: 'Sprint not found' })
  async completeSprint(@Param('id') id: string) {
    return this.sprintsService.completeSprint(id);
  }
}
