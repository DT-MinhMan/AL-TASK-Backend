// 📁 src/modules/auth/controllers/auth.controller.ts

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto, LoginDto, UpdateUserDto } from '../dtos/auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RequestPasswordResetDto, ResetPasswordWithTokenDto, ResetPasswordWithOtpDto, VerifyOtpDto } from '../dtos/password-reset.dto';
import { PermissionsService } from '../../permissions/services/permissions.service';
import { Document } from 'mongoose';

// Interface để định nghĩa kiểu dữ liệu của req.user
interface RequestWithUser extends Request {
  user: {
    userId: string; // Thay vì `id`
    email?: string;
    role?: string;
  };
}

interface AuthError extends Error {
  stack?: string;
  message: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) { }

  // Kiểm tra email trước khi submit
  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email không được để trống');
    }
    const isValid = await this.authService.checkEmail(email);
    return { isValid };
  }

  // 📥 Đăng ký người dùng
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log('📥 Bắt đầu đăng ký người dùng...');
    this.logger.debug(
      `Dữ liệu đăng ký: ${JSON.stringify({
        email: registerDto.email,
        role: registerDto.role,
      })}`,
    );

    try {
      const result = await this.authService.register(registerDto);
      this.logger.log(`✅ Đăng ký thành công cho email: ${registerDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Lỗi khi đăng ký người dùng: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 🔐 Đăng nhập người dùng
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    this.logger.log('🔐 Đang xử lý đăng nhập...');
    this.logger.debug(`Thông tin đăng nhập: ${loginDto.email}`);

    try {
      const result = await this.authService.login(loginDto);
      this.logger.log(
        `✅ Đăng nhập thành công cho email: ${loginDto.email} với vai trò ${result.user.role}`,
      );
      return result;
    } catch (error) {
      const err = error as AuthError;
      this.logger.error(`❌ Lỗi khi đăng nhập: ${err.message}`, err.stack);
      throw error;
    }
  }

  // 🚪 Đăng xuất người dùng
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: RequestWithUser) {
    const userId = req.user?.userId;
    this.logger.log(`🚪 Đang đăng xuất người dùng với ID: ${userId}`);

    try {
      const result = await this.authService.logout(userId);
      this.logger.log(`✅ Đăng xuất thành công cho ID: ${userId}`);
      return result;
    } catch (error) {
      const err = error as AuthError;
      this.logger.error(`❌ Lỗi khi đăng xuất: ${err.message}`, err.stack);
      throw error;
    }
  }

  // 👤 Lấy thông tin người dùng
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: RequestWithUser) {
    const userId = req.user?.userId; // Đổi từ `req.user.id` sang `req.user.userId`
    this.logger.log(`👤 Đang lấy thông tin người dùng với ID: ${userId}`);

    if (!userId) {
      throw new UnauthorizedException('User ID không tồn tại trong request');
    }

    try {
      const result = await this.userService.getUserById(userId);
      this.logger.log(`✅ Lấy thông tin thành công cho ID: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Lỗi khi lấy thông tin người dùng: ${error.message}`,
      );
      throw error;
    }
  }

  // 🔒 Lấy quyền của người dùng đã đăng nhập
  @Get('my-permissions')
  @UseGuards(JwtAuthGuard)
  async getMyPermissions(@Request() req: RequestWithUser) {
    const userId = req.user?.userId;
    const role = req.user?.role;

    try {
      // Nếu người dùng là admin, trả về danh sách tất cả các quyền
      if (role === 'admin') {
        const allPermissions = await this.permissionsService.findAll();
        return {
          role: 'admin',
          permissions: allPermissions.map(p => ({
            id: (p as any as Document).id,
            resource: p.resource,
            action: p.action
          })),
          isAdmin: true
        };
      }

      // Đối với người dùng khác, lấy quyền từ bảng user_permissions và role_permissions
      const userPermissions = await this.permissionsService.getUserPermissions(userId);
      const permissions = userPermissions.map(permission => ({
        id: permission._id.toString(),
        resource: permission.resource,
        action: permission.action,
        source: permission.source
      }));

      this.logger.log(`✅ Lấy ${permissions.length} quyền thành công cho người dùng ${userId}`);

      return {
        role,
        permissions,
        isAdmin: role === 'admin'
      };
    } catch (error) {
      this.logger.error(
        `❌ Lỗi khi lấy quyền người dùng: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  // 📋 Lấy danh sách tất cả người dùng (Chỉ Admin)
  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getAllUsers() {
    this.logger.log('📋 Đang lấy danh sách tất cả người dùng...');

    try {
      const result = await this.userService.getAllUsers();
      this.logger.log(
        `✅ Lấy danh sách người dùng thành công, tổng cộng: ${result.length} người dùng`,
      );
      return result;
    } catch (error) {
      const err = error as AuthError;
      this.logger.error(
        `❌ Lỗi khi lấy danh sách người dùng: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  // ✏️ Cập nhật thông tin người dùng
  @Put('update')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const userId = req.user.userId;
    this.logger.log(`✏️ Đang cập nhật thông tin người dùng với ID: ${userId}`);
    this.logger.debug(`Dữ liệu cập nhật: ${JSON.stringify(updateUserDto)}`);

    try {
      const result = await this.userService.updateUser(userId, updateUserDto);
      this.logger.log(`✅ Cập nhật thông tin thành công cho ID: ${userId}`);
      return result;
    } catch (error) {
      const err = error as AuthError;
      this.logger.error(
        `❌ Lỗi khi cập nhật thông tin người dùng: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  // 👉 Chuyển hướng đến Google để xác thực
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    return;
  }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: RequestWithUser, @Res() res: Response) {
    try {
      if (!req.user) {
        throw new BadRequestException('Google login failed');
      }

      // ✅ Xử lý đăng nhập hoặc tạo user mới
      const { user, token } = await this.authService.validateGoogleUser(req.user);

      if (!user) {
        throw new BadRequestException('Xác thực Google thất bại');
      }

      // ✅ Chuyển hướng đến client với token
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
      const redirectUrl = user.role === 'admin'
        ? `${frontendUrl}/admin`
        : `${frontendUrl}/`;

      // Add token as a query parameter
      const redirectUrlWithToken = `${redirectUrl}?token=${token}`;

      this.logger.log(`✅ Google auth successful for user: ${user.email}`);
      return res.redirect(redirectUrlWithToken);
    } catch (error) {
      this.logger.error('❌ Lỗi xác thực Google:', error);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('reset-password/token')
  async resetPasswordWithToken(@Body() dto: ResetPasswordWithTokenDto) {
    return this.authService.resetPasswordWithToken(dto);
  }

  @Post('reset-password/otp')
  async resetPasswordWithOtp(@Body() dto: ResetPasswordWithOtpDto) {
    return this.authService.resetPasswordWithOtp(dto);
  }

  @Get('check-permission')
  @UseGuards(JwtAuthGuard)
  async checkPermission(@Request() req) {
    try {
      const userId = req.user.id;
      const userPermissions = await this.permissionsService.getUserPermissions(userId);

      const permissions = userPermissions.map(up => ({
        resource: up.resource,
        action: up.action,
        source: up.source
      }));

      return {
        success: true,
        permissions,
      };
    } catch (error) {
      throw new UnauthorizedException('Error checking permissions');
    }
  }
}
