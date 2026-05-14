import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';

import { LoginDto, RegisterDto } from '../dtos/auth.dto';
import {
  RequestPasswordResetDto,
  ResetPasswordWithOtpDto,
  ResetPasswordWithTokenDto,
  VerifyOtpDto,
} from '../dtos/password-reset.dto';
import { User } from '../../users/schemas/users.schema';
import { UsersService } from '../../users/services/users.service';
import { AuthenticationService } from './authentication.service';
import { OAuthService } from './oauth.service';
import { PasswordResetService } from './password-reset.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly passwordResetService: PasswordResetService,
    private readonly oauthService: OAuthService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit() {
    const refreshSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
    if (!refreshSecret) {
      throw new Error('REFRESH_TOKEN_SECRET is not configured. Application cannot start.');
    }

    const passwordResetSecret = this.configService.get<string>('PASSWORD_RESET_SECRET');
    if (!passwordResetSecret) {
      throw new Error('PASSWORD_RESET_SECRET is not configured. Application cannot start.');
    }
  }

  checkEmail(email: string): Promise<boolean> {
    return this.authenticationService.checkEmail(email);
  }

  register(registerDto: RegisterDto) {
    return this.authenticationService.register(registerDto);
  }

  login(loginDto: LoginDto) {
    return this.authenticationService.login(loginDto);
  }

  logout(accessToken?: string, refreshToken?: string): Promise<{ message: string }> {
    this.logger.log('Logging out current session');
    return this.tokenService.revokeSessionTokens(accessToken, refreshToken);
  }

  refreshAccessToken(
    refreshToken: string,
  ): Promise<{ success: boolean; accessToken: string; refreshToken: string }> {
    return this.tokenService.refreshAccessToken(refreshToken);
  }

  validateGoogleUser(profile: {
    emails?: { value: string }[];
    email?: string;
    id?: string;
    fullName?: string;
    photos?: { value: string }[];
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    return this.oauthService.validateGoogleUser(profile);
  }

  requestPasswordReset(dto: RequestPasswordResetDto) {
    return this.passwordResetService.requestPasswordReset(dto);
  }

  verifyOtp(dto: VerifyOtpDto) {
    return this.passwordResetService.verifyOtp(dto);
  }

  resetPasswordWithToken(dto: ResetPasswordWithTokenDto) {
    return this.passwordResetService.resetPasswordWithToken(dto);
  }

  resetPasswordWithOtp(dto: ResetPasswordWithOtpDto) {
    return this.passwordResetService.resetPasswordWithOtp(dto);
  }

  async findUserById(userId: string): Promise<User> {
    try {
      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      return user;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error finding user by ID: ${err.message}`);
      throw error;
    }
  }

  async assignCustomRoleToUser(userId: string, roleId: string): Promise<User> {
    try {
      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      await this.usersService.updateUser(userId, {
        roleId: new Types.ObjectId(roleId),
      });

      return this.usersService.getUserById(userId);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error assigning custom role to user: ${err.message}`);
      throw error;
    }
  }

  async removeCustomRoleFromUser(userId: string): Promise<User> {
    try {
      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      await this.usersService.updateUser(userId, {
        $unset: { roleId: '' },
      });

      return this.usersService.getUserById(userId);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error removing custom role from user: ${err.message}`);
      throw error;
    }
  }
}
