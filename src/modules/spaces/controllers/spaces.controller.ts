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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SpacesService } from '../services/spaces.service';
import { CreateSpaceDto, UpdateSpaceDto } from '../dtos/create-space.dto';
import { AddMemberDto } from '../dtos/update-space.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScopedRoleGuard } from '../../../common/guards/scoped-role.guard';
import { SPACE_ROLES } from '../../../common/constants/space-role.constants';

@ApiTags('Spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  @ApiOperation({ summary: 'List spaces' })
  @ApiQuery({ name: 'workspaceId', required: false, description: 'Filter by workspace ID' })
  async findAll(@Request() req, @Query('workspaceId') workspaceId?: string) {
    if (workspaceId) {
      return this.spacesService.findByWorkspace(workspaceId);
    }
    return this.spacesService.findByUserId(req.user.userId);
  }

  @Get(':id')
  @UseGuards(ScopedRoleGuard('space', SPACE_ROLES.VIEWER))
  @ApiOperation({ summary: 'Get space by ID' })
  async findOne(@Param('id') id: string) {
    return this.spacesService.findById(id);
  }

  @Post()
  @UseGuards(ScopedRoleGuard('workspace', SPACE_ROLES.MEMBER))
  @ApiOperation({ summary: 'Create a new space' })
  async create(
    @Body() createSpaceDto: CreateSpaceDto & { workspaceId?: string },
    @Request() req,
  ) {
    if (!createSpaceDto.workspaceId) {
      throw new ForbiddenException('workspaceId is required');
    }
    return this.spacesService.create(createSpaceDto, req.user.userId, createSpaceDto.workspaceId);
  }

  @Put(':id')
  @UseGuards(ScopedRoleGuard('space', SPACE_ROLES.SPACE_ADMIN))
  @ApiOperation({ summary: 'Update space (owner/space admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(id, updateSpaceDto);
  }

  @Delete(':id')
  @UseGuards(ScopedRoleGuard('space', SPACE_ROLES.SPACE_ADMIN))
  @ApiOperation({ summary: 'Delete space (owner only)' })
  async delete(@Param('id') id: string) {
    await this.spacesService.delete(id);
    return { message: 'Space deleted successfully' };
  }

  @Get(':id/members')
  @UseGuards(ScopedRoleGuard('space', SPACE_ROLES.VIEWER))
  @ApiOperation({ summary: 'List space members' })
  async getMembers(@Param('id') id: string) {
    return this.spacesService.getMembers(id);
  }

  @Post(':id/members')
  @UseGuards(ScopedRoleGuard('space', SPACE_ROLES.SPACE_ADMIN))
  @ApiOperation({ summary: 'Add member to space (owner/space admin only)' })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.spacesService.addMember(id, addMemberDto.userId, addMemberDto.role);
  }

  @Delete(':id/members/:userId')
  @UseGuards(ScopedRoleGuard('space', SPACE_ROLES.SPACE_ADMIN))
  @ApiOperation({ summary: 'Remove member from space (owner/space admin only)' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const space = await this.spacesService.findById(id);
    if (space.ownerId.toString() === userId) {
      throw new ForbiddenException('Cannot remove the owner from the space');
    }

    return this.spacesService.removeMember(id, userId);
  }
}
