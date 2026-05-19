// 📁 src/modules/auth/controllers/password.controller.ts

import {
  Controller,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PasswordResetService } from '../services/password-reset.service';
import {
  RequestPasswordResetDto,
  ResetPasswordWithGrantDto,
  ResetPasswordWithTokenDto,
  ResetPasswordWithOtpDto,
  VerifyOtpDto,
} from '../dtos/password-reset.dto';
import { Request as ExpressRequest } from 'express';
import { AuditLogService } from '../services/audit-log.service';

// Password recovery endpoints are attack targets, so they use explicit
// method-level throttles and never skip throttling at controller level.
@Controller('auth')
export class PasswordController {
  constructor(
    private readonly passwordResetService: PasswordResetService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // 🔑 Password reset — throttle: 3/15min (chống email bombing)
  @Throttle({ default: { limit: 3, ttl: 900_000 } })
  @Post('request-password-reset')
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
    @Req() req: ExpressRequest,
  ) {
    const result = await this.passwordResetService.requestPasswordReset(dto);
    this.auditLogService.logRequest(req, {
      type: 'PASSWORD_RESET_REQUESTED',
      severity: 'INFO',
      // Không log email để tránh tiết lộ qua log stream
    });
    return result;
  }

  // 🔢 Verify OTP — throttle: 5/min (chống brute-force OTP)
  // @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: ExpressRequest) {
    try {
      const result = await this.passwordResetService.verifyOtpAndIssueGrant(dto);
      this.auditLogService.logRequest(req, {
        type: 'OTP_VERIFIED_GRANT_ISSUED',
        severity: 'INFO',
        metadata: { expiresIn: result.expiresIn },
      });
      return result;
    } catch (error) {
      this.auditLogService.logRequest(req, {
        type: 'OTP_VERIFY_FAILED',
        severity: 'WARN',
      });
      throw error;
    }
  }

  // 🔒 Reset password với JWT token
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password/token')
  async resetPasswordWithToken(
    @Body() dto: ResetPasswordWithTokenDto,
    @Req() req: ExpressRequest,
  ) {
    try {
      const result = await this.passwordResetService.resetPasswordWithToken(dto);
      this.auditLogService.logRequest(req, {
        type: 'PASSWORD_RESET_COMPLETED',
        severity: 'INFO',
        metadata: { method: 'token' },
      });
      return result;
    } catch (error) {
      this.auditLogService.logRequest(req, {
        type: 'PASSWORD_RESET_FAILED',
        severity: 'WARN',
        metadata: { method: 'token', reason: (error as Error).message },
      });
      throw error;
    }
  }

  // Grant-based reset is the primary OTP reset flow. The grant is one-time and
  // short-lived so the OTP itself is never reused after verification.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  async resetPasswordWithGrant(
    @Body() dto: ResetPasswordWithGrantDto,
    @Req() req: ExpressRequest,
  ) {
    try {
      const result = await this.passwordResetService.resetPasswordWithGrant(dto);
      this.auditLogService.logRequest(req, {
        type: 'PASSWORD_RESET_COMPLETED',
        severity: 'INFO',
        metadata: { method: 'grant-token' },
      });
      return result;
    } catch (error) {
      this.auditLogService.logRequest(req, {
        type: 'PASSWORD_RESET_FAILED',
        severity: 'WARN',
        metadata: { method: 'grant-token', reason: (error as Error).message },
      });
      throw error;
    }
  }

  // 🔒 Reset password với OTP
  // Deprecated: kept temporarily for older clients. New clients should use
  // /auth/verify-otp followed by /auth/reset-password.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password/otp')
  async resetPasswordWithOtp(
    @Body() dto: ResetPasswordWithOtpDto,
    @Req() req: ExpressRequest,
  ) {
    try {
      const result = await this.passwordResetService.resetPasswordWithOtp(dto);
      this.auditLogService.logRequest(req, {
        type: 'PASSWORD_RESET_COMPLETED',
        severity: 'INFO',
        metadata: { method: 'otp' },
      });
      return result;
    } catch (error) {
      this.auditLogService.logRequest(req, {
        type: 'OTP_FAILED',
        severity: 'WARN',
        metadata: { method: 'otp-reset', reason: (error as Error).message },
      });
      throw error;
    }
  }
}
