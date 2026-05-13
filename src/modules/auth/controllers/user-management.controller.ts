// 📁 src/modules/auth/controllers/user-management.controller.ts
//
// NOTE: Các endpoint quản lý user này hiện đặt tạm trong AuthModule vì lý do tiện lợi.
// Về lâu dài, nên migrate sang UserModule độc lập (chưa thực hiện trong refactor này).

import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UsersService } from '../../users/services/users.service';
import { UpdateProfileDto } from '../dtos/auth.dto';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
    email?: string;
    role?: string;
  };
}

interface AuthError extends Error {
  stack?: string;
  message: string;
}

@Controller('auth')
export class UserManagementController {
  private readonly logger = new Logger(UserManagementController.name);

  constructor(
    private readonly userService: UsersService,
  ) {}

  // 📋 Lấy danh sách tất cả người dùng
  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getAllUsers() {
    try {
      return await this.userService.getAllUsers();
    } catch (error) {
      const err = error as AuthError;
      this.logger.error(`❌ Lỗi khi lấy danh sách người dùng: ${err.message}`, err.stack);
      throw error;
    }
  }

  // ✏️ Cập nhật thông tin người dùng
  @Put('update')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateProfileDto,
  ) {
    const userId = req.user.userId;
    try {
      return await this.userService.updateUser(userId, updateUserDto);
    } catch (error) {
      const err = error as AuthError;
      this.logger.error(`❌ Lỗi khi cập nhật thông tin người dùng: ${err.message}`, err.stack);
      throw error;
    }
  }
}
