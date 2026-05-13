// 📁 src/modules/auth/controllers/password.controller.ts

import {
  Controller,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { RequestPasswordResetDto, ResetPasswordWithTokenDto, ResetPasswordWithOtpDto, VerifyOtpDto } from '../dtos/password-reset.dto';
import { Request as ExpressRequest } from 'express';
import { AuditLogService } from '../services/audit-log.service';

// SkipThrottle tại class level — throttle áp trên endpoint cụ thể
@SkipThrottle()
@Controller('auth')
export class PasswordController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogService: AuditLogService,
  ) {}

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
}
