import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService } from '../services/notifications.service';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications' })
  @ApiResponse({ status: 200, description: 'Returns paginated notifications for the current user' })
  async findMyNotifications(
    @Req() req: Request & { user?: { userId: string; email?: string; role?: string } },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    if (!req.user) return { data: [], total: 0, page: 1, limit: 20 };
    const userId = req.user.userId;
    return this.notificationsService.findByUser(userId, page, limit);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Returns count of unread notifications' })
  async getUnreadCount(@Req() req: Request & { user?: { userId: string; email?: string; role?: string } }) {
    if (!req.user) return { count: 0 };
    const userId = req.user.userId;
    const count = await this.notificationsService.findUnread(userId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Returns the notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findById(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification (internal/admin use)' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Req() req: Request & { user?: { userId: string; email?: string; role?: string } }) {
    if (!req.user) return { message: 'No user' };
    const userId = req.user.userId;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async delete(@Param('id') id: string) {
    await this.notificationsService.delete(id);
    return { message: 'Notification deleted successfully' };
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all my notifications' })
  @ApiResponse({ status: 200, description: 'All notifications deleted' })
  async deleteAll(@Req() req: Request & { user?: { userId: string; email?: string; role?: string } }) {
    if (!req.user) return { message: 'No user' };
    const userId = req.user.userId;
    return this.notificationsService.deleteAll(userId);
  }
}
