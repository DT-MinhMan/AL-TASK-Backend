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
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto, UpdateMemberDto } from '../dtos/create-project.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects or filter by workspace' })
  @ApiQuery({ name: 'workspaceId', required: false })
  async findAll(@Query('workspaceId') workspaceId?: string) {
    if (workspaceId) {
      return this.projectsService.findByWorkspace(workspaceId);
    }
    return this.projectsService.findByUserId(Request['user'].userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(createProjectDto, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  async delete(@Param('id') id: string) {
    await this.projectsService.delete(id);
    return { message: 'Project deleted successfully' };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get project members' })
  async getMembers(@Param('id') id: string) {
    return this.projectsService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to the project' })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.projectsService.addMember(id, addMemberDto);
  }

  @Put(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role' })
  async updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.projectsService.updateMemberRole(id, userId, updateMemberDto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the project' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.projectsService.removeMember(id, userId);
    return { message: 'Member removed successfully' };
  }
}
