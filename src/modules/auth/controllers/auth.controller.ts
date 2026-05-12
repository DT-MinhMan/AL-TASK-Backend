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
  Headers,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from '../dtos/auth.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { Response, Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import { RequestPasswordResetDto, ResetPasswordWithTokenDto, ResetPasswordWithOtpDto, VerifyOtpDto } from '../dtos/password-reset.dto';
import { PermissionsService } from '../../permissions/services/permissions.service';
import { Document } from 'mongoose';
import { getAccessCookieOptions, getRefreshCookieOptions, getCookieOptions, JWT_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../../config/cookie.config';
import { AuditLogService } from '../services/audit-log.service';

// Interface để định nghĩa kiểu dữ liệu của req.user
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

// SkipThrottle tại class level — chỉ áp throttle trên endpoint cụ thể
@SkipThrottle()
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
    private readonly auditLogService: AuditLogService,
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

  // 📥 Đăng ký người dùng — throttle: 10/min để chống spam account
  @Throttle({ login: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: ExpressRequest) {
    this.logger.log('📥 Bắt đầu đăng ký người dùng...');

    try {
      const result = await this.authService.register(registerDto);
      this.auditLogService.log({
        type: 'REGISTER_SUCCESS',
        severity: 'INFO',
        email: registerDto.email,
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
      });
      return result;
    } catch (error) {
      const err = error as Error;
      this.auditLogService.log({
        type: 'REGISTER_FAILED',
        severity: 'WARN',
        email: registerDto.email,
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { reason: err.message },
      });
      throw error;
    }
  }

  // 🔐 Đăng nhập — throttle: 5/min per IP (brute-force protection)
  @Throttle({ login: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: ExpressRequest,
  ) {
    this.logger.log('🔐 Đang xử lý đăng nhập...');

    try {
      const result = await this.authService.login(loginDto);

      // ✅ Set cả 2 tokens vào HttpOnly Cookie
      res.cookie(JWT_COOKIE_NAME, result.accessToken, getAccessCookieOptions(this.configService));
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions(this.configService));

      this.auditLogService.log({
        type: 'LOGIN_SUCCESS',
        severity: 'INFO',
        email: loginDto.email,
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { role: result.user.role },
      });

      return result;
    } catch (error) {
      const err = error as AuthError;
      this.auditLogService.log({
        type: 'LOGIN_FAILED',
        severity: 'WARN',
        email: loginDto.email,
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { reason: err.message },
      });
      throw error;
    }
  }

  // 🚪 Đăng xuất — không cần throttle (guard đã bảo vệ)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user?.userId;

    const accessTokenFromCookie = req.cookies?.[JWT_COOKIE_NAME];
    const authHeader = (req.headers as any)['authorization'] as string | undefined;
    const accessTokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const accessToken = accessTokenFromCookie || accessTokenFromHeader;
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    try {
      const result = await this.authService.logout(accessToken, refreshToken);

      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      const clearOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
        path: '/',
      };
      res.clearCookie(JWT_COOKIE_NAME, clearOptions);
      res.clearCookie(REFRESH_COOKIE_NAME, clearOptions);

      this.auditLogService.log({
        type: 'LOGOUT',
        severity: 'INFO',
        userId,
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
      });

      return result;
    } catch (error) {
      const err = error as AuthError;
      this.logger.error(`❌ Lỗi khi đăng xuất: ${err.message}`, err.stack);
      throw error;
    }
  }

  // 🔄 Refresh — throttle: 30/min (mobile-friendly, không block concurrent retry)
  @Throttle({ refresh: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(
    @Req() req: RequestWithUser,
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }

    try {
      const result = await this.authService.refreshAccessToken(refreshToken);

      res.cookie(JWT_COOKIE_NAME, result.accessToken, getAccessCookieOptions(this.configService));
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions(this.configService));

      return { success: true, message: 'Làm mới token thành công' };
    } catch (error) {
      const err = error as AuthError;
      this.logger.error(`❌ Lỗi khi refresh token: ${err.message}`, err.stack);
      throw error;
    }
  }

  // 👤 Lấy thông tin người dùng
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User ID không tồn tại trong request');
    }
    try {
      return await this.userService.getUserById(userId);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Lỗi khi lấy thông tin người dùng: ${err.message}`);
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
      if (role === 'admin') {
        const allPermissions = await this.permissionsService.findAll();
        return {
          role: 'admin',
          permissions: allPermissions.map(p => ({
            id: (p as any as Document).id,
            resource: p.resource,
            action: p.action,
          })),
          isAdmin: true,
        };
      }

      const userPermissions = await this.permissionsService.getUserPermissions(userId);
      return {
        role,
        permissions: userPermissions.map(permission => ({
          id: permission._id.toString(),
          resource: permission.resource,
          action: permission.action,
          source: permission.source,
        })),
        isAdmin: false,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Lỗi khi lấy quyền người dùng: ${err.message}`, err.stack);
      throw error;
    }
  }

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

  // 👉 Chuyển hướng đến Google để xác thực
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    return;
  }

  // 🔄 Google OAuth callback — cấp access + refresh token (đồng nhất với login thường)
  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: RequestWithUser, @Res() res: Response) {
    try {
      if (!req.user) {
        throw new BadRequestException('Google login failed');
      }

      // ✅ Phase 3: Nhận đủ access + refresh token (đồng nhất với login thường)
      const { user, accessToken, refreshToken } = await this.authService.validateGoogleUser(req.user);

      if (!user) {
        throw new BadRequestException('Xác thực Google thất bại');
      }

      // ✅ Set cả 2 HttpOnly cookies — token KHÔNG xuất hiện trên URL
      res.cookie(JWT_COOKIE_NAME, accessToken, getAccessCookieOptions(this.configService));
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(this.configService));

      this.auditLogService.log({
        type: 'GOOGLE_LOGIN_SUCCESS',
        severity: 'INFO',
        email: user.email,
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { role: user.role },
      });

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const dashboardUrl = this.configService.get<string>('FRONTEND_DASHBOARD_URL') || `${frontendUrl}/dashboard`;
      const redirectUrl = user.role === 'admin' ? dashboardUrl : `${frontendUrl}/`;

      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('❌ Lỗi xác thực Google:', error);
      this.auditLogService.log({
        type: 'GOOGLE_LOGIN_FAILED',
        severity: 'WARN',
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { reason: (error as Error).message },
      });
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  // 🔑 Password reset — throttle: 3/15min (chống email bombing)
  @Throttle({ reset: { limit: 3, ttl: 900_000 } })
  @Post('request-password-reset')
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: ExpressRequest,
  ) {
    const result = await this.authService.requestPasswordReset(dto);
    this.auditLogService.log({
      type: 'PASSWORD_RESET_REQUESTED',
      severity: 'INFO',
      ip: AuditLogService.extractIp(req),
      userAgent: AuditLogService.extractUserAgent(req),
      // Không log email để tránh tiết lộ qua log stream
    });
    return result;
  }

  // 🔢 Verify OTP — throttle: 5/min (chống brute-force OTP)
  @Throttle({ otp: { limit: 5, ttl: 60_000 } })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: ExpressRequest) {
    try {
      const result = await this.authService.verifyOtp(dto);
      this.auditLogService.log({
        type: 'OTP_VERIFIED',
        severity: 'INFO',
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
      });
      return result;
    } catch (error) {
      this.auditLogService.log({
        type: 'OTP_FAILED',
        severity: 'WARN',
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
      });
      throw error;
    }
  }

  // 🔒 Reset password với JWT token
  @Throttle({ otp: { limit: 5, ttl: 60_000 } })
  @Post('reset-password/token')
  async resetPasswordWithToken(
    @Body() dto: ResetPasswordWithTokenDto,
    @Req() req: ExpressRequest,
  ) {
    try {
      const result = await this.authService.resetPasswordWithToken(dto);
      this.auditLogService.log({
        type: 'PASSWORD_RESET_COMPLETED',
        severity: 'INFO',
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { method: 'token' },
      });
      return result;
    } catch (error) {
      this.auditLogService.log({
        type: 'PASSWORD_RESET_FAILED',
        severity: 'WARN',
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { method: 'token', reason: (error as Error).message },
      });
      throw error;
    }
  }

  // 🔒 Reset password với OTP
  @Throttle({ otp: { limit: 5, ttl: 60_000 } })
  @Post('reset-password/otp')
  async resetPasswordWithOtp(
    @Body() dto: ResetPasswordWithOtpDto,
    @Req() req: ExpressRequest,
  ) {
    try {
      const result = await this.authService.resetPasswordWithOtp(dto);
      this.auditLogService.log({
        type: 'PASSWORD_RESET_COMPLETED',
        severity: 'INFO',
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { method: 'otp' },
      });
      return result;
    } catch (error) {
      this.auditLogService.log({
        type: 'OTP_FAILED',
        severity: 'WARN',
        ip: AuditLogService.extractIp(req),
        userAgent: AuditLogService.extractUserAgent(req),
        metadata: { method: 'otp-reset', reason: (error as Error).message },
      });
      throw error;
    }
  }

  @Get('check-permission')
  @UseGuards(JwtAuthGuard)
  async checkPermission(@Request() req) {
    try {
      const userId = req.user.userId;
      const userPermissions = await this.permissionsService.getUserPermissions(userId);
      return {
        success: true,
        permissions: userPermissions.map(up => ({
          resource: up.resource,
          action: up.action,
          source: up.source,
        })),
      };
    } catch (error) {
      throw new UnauthorizedException('Error checking permissions');
    }
  }
}
