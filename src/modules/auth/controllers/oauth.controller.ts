// 📁 src/modules/auth/controllers/oauth.controller.ts

import {
  Controller,
  Get,
  BadRequestException,
  UseGuards,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { Response, Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import { getAccessCookieOptions, getRefreshCookieOptions, JWT_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../../config/cookie.config';
import { AuditLogService } from '../services/audit-log.service';

interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
    email?: string;
    role?: string;
  };
}

// SkipThrottle tại class level — throttle áp trên endpoint cụ thể nếu cần
@SkipThrottle()
@Controller('auth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

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
}
