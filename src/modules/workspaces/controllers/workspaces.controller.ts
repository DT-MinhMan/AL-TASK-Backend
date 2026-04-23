import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkspacesService } from '../services/workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from '../dtos/create-workspace.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for current user' })
  async findAll(@Request() req: any) {
    return this.workspacesService.findByUserId(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace by ID' })
  async findOne(@Param('id') id: string) {
    const workspace = await this.workspacesService.findById(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${id}" not found`);
    }
    return workspace;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(req.user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workspace (owner/admin only)' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    const isAdmin = await this.workspacesService.isAdmin(id, req.user.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only owner or admin can update workspace');
    }
    return this.workspacesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workspace (owner only)' })
  async remove(@Request() req: any, @Param('id') id: string) {
    const isOwner = await this.workspacesService.isOwner(id, req.user.userId);
    if (!isOwner) {
      throw new ForbiddenException('Only owner can delete workspace');
    }
    await this.workspacesService.delete(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get workspace members' })
  async getMembers(@Param('id') id: string) {
    return this.workspacesService.getMembers(id);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add member to workspace (admin/owner only)' })
  async addMember(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { userId: string; role: 'admin' | 'member' | 'viewer' },
  ) {
    const isAdmin = await this.workspacesService.isAdmin(id, req.user.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only owner or admin can add members');
    }
    return this.workspacesService.addMember(id, body.userId, body.role);
  }

  @Put(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role (admin/owner only)' })
  async updateMemberRole(
    @Request() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { role: 'admin' | 'member' | 'viewer' },
  ) {
    const isAdmin = await this.workspacesService.isAdmin(id, req.user.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only owner or admin can update member roles');
    }
    return this.workspacesService.updateMemberRole(id, userId, body.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from workspace (admin/owner only)' })
  async removeMember(
    @Request() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const isAdmin = await this.workspacesService.isAdmin(id, req.user.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only owner or admin can remove members');
    }
    await this.workspacesService.removeMember(id, userId);
  }
}
