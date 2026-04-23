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

@ApiTags('Spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get()
  @ApiOperation({ summary: 'List spaces' })
  @ApiQuery({ name: 'workspaceId', required: false, description: 'Filter by workspace ID' })
  async findAll(@Query('workspaceId') workspaceId?: string) {
    if (workspaceId) {
      return this.spacesService.findByWorkspace(workspaceId);
    }
    return this.spacesService.findByUserId(Request['user'].userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get space by ID' })
  async findOne(@Param('id') id: string) {
    return this.spacesService.findById(id);
  }

  @Post()
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
  @ApiOperation({ summary: 'Update space (owner/admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
    @Request() req,
  ) {
    const isAdmin = await this.spacesService.isAdmin(id, req.user.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only owner or admin can update this space');
    }
    return this.spacesService.update(id, updateSpaceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete space (owner only)' })
  async delete(@Param('id') id: string, @Request() req) {
    const isOwner = await this.spacesService.isOwner(id, req.user.userId);
    if (!isOwner) {
      throw new ForbiddenException('Only owner can delete this space');
    }
    await this.spacesService.delete(id);
    return { message: 'Space deleted successfully' };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List space members' })
  async getMembers(@Param('id') id: string) {
    return this.spacesService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to space (owner/admin only)' })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @Request() req,
  ) {
    const isAdmin = await this.spacesService.isAdmin(id, req.user.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only owner or admin can add members');
    }
    return this.spacesService.addMember(id, addMemberDto.userId, addMemberDto.role);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from space (owner/admin only)' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    const isAdmin = await this.spacesService.isAdmin(id, req.user.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only owner or admin can remove members');
    }

    const space = await this.spacesService.findById(id);
    if (space.ownerId.toString() === userId) {
      throw new ForbiddenException('Cannot remove the owner from the space');
    }

    return this.spacesService.removeMember(id, userId);
  }
}
