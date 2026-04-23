import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('workspace/:workspaceId')
  @ApiOperation({ summary: 'Get workspace overview statistics' })
  async getWorkspaceOverview(@Param('workspaceId') workspaceId: string, @Request() req) {
    return this.dashboardService.getWorkspaceOverview(workspaceId, req.user.userId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get project-specific statistics' })
  async getProjectStats(@Param('projectId') projectId: string) {
    return this.dashboardService.getProjectStats(projectId);
  }

  @Get('user/me')
  @ApiOperation({ summary: 'Get current user statistics' })
  async getUserStats(@Request() req) {
    return this.dashboardService.getUserStats(req.user.userId);
  }

  @Get('sprint/:sprintId')
  @ApiOperation({ summary: 'Get sprint progress' })
  async getSprintProgress(@Param('sprintId') sprintId: string) {
    return this.dashboardService.getSprintProgress(sprintId);
  }
}
