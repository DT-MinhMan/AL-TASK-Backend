// 📁 src/modules/auth/controllers/auth.controller.ts

import {
  Controller,
  Post,
  Get,
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
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Response, Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import { getAccessCookieOptions, getRefreshCookieOptions, JWT_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../../config/cookie.config';
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
    private readonly auditLogService: AuditLogService,
  ) {}

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
}
