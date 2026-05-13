// 📁 src/modules/auth/services/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerifyService } from '../../verify/services/verify.service';
import { User } from '../../users/schemas/users.schema';
import { RequestPasswordResetDto, ResetPasswordWithTokenDto, ResetPasswordWithOtpDto, VerifyOtpDto } from '../dtos/password-reset.dto';
import { randomBytes } from 'crypto';
import { Auth } from '../schemas/auth.schema';
import { Types } from 'mongoose';
import { AuditLogService } from './audit-log.service';
import { PasswordResetService } from './password-reset.service';
import { OAuthService } from './oauth.service';
import { TOKEN_TYPES } from '../constants/token.constants';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    private readonly verifyService: VerifyService,
    private readonly auditLogService: AuditLogService,
    private readonly passwordResetService: PasswordResetService,
    private readonly oauthService: OAuthService,
  ) { }

  // SEC-9: Fail fast nếu thiếu secret bắt buộc
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

  /**
   * 📥 Kiểm tra email trước khi submit
   */
  async checkEmail(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    return !user; // Trả về `true` nếu email chưa tồn tại, `false` nếu đã tồn tại
  }

  /**
   * 📥 Đăng ký người dùng mới (mặc định role là 'user')
   */
  async register(registerDto: RegisterDto) {
    try {
      // Kiểm tra email đã tồn tại
      const existingUser = await this.usersService.findByEmail(
        registerDto.email,
      );

      if (existingUser) {
        // Kiểm tra trạng thái nếu user tồn tại
        // if (existingUser.status === 'pending') {
        //   throw new BadRequestException('Tài khoản chưa được kích hoạt');
        // }
        throw new ConflictException('Email đã được sử dụng');
      }

      // Tạo user mới mà không mã hóa mật khẩu (giả định mật khẩu đã được mã hóa từ frontend)
      const newUser = await this.usersService.createUser({
        email: registerDto.email,
        password: registerDto.password,
        role: 'user',
        // status: 'pending',
        status: 'active',
      });

      // Gửi email xác thực
      // await this.verifyService.sendVerificationEmail(registerDto.email);

      return {
        success: true,
        message:
          'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        email: registerDto.email,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        '❌ Lỗi trong quá trình đăng ký:',
        err.message,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * 🔐 Đăng nhập người dùng (HttpOnly Cookie Auth + Access + Refresh Token)
   */
  async login(loginDto: LoginDto) {
    try {
      // Tìm user theo email
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
      }

      // // Kiểm tra trạng thái tài khoản
      // if (user.status === 'pending') {
      //   throw new UnauthorizedException(
      //     'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.',
      //   );
      // }

      // Kiểm tra xem user có password không
      if (!user.password) {
        throw new UnauthorizedException('Tài khoản này được đăng ký qua Google. Vui lòng đăng nhập bằng Google.');
      }

      // Kiểm tra mật khẩu
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
      }

      // ✅ Tạo cả access + refresh token
      const { accessToken, refreshToken } = await this.createAndSaveTokens(
        user._id.toString(),
        user.email,
        user.role,
        user.fullName,
        user.avatar,
      );

      // Tokens are only for the controller to set HttpOnly cookies; never expose them in JSON.
      return {
        success: true,
        message: 'Đăng nhập thành công',
        tokens: { accessToken, refreshToken },
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          avatar: user.avatar,
        },
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Lỗi khi đăng nhập: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 🚪 Đăng xuất người dùng - revoke cả access token và refresh token
   */
  async logout(accessToken?: string, refreshToken?: string): Promise<{ message: string }> {
    this.logger.log('Đang đăng xuất phiên hiện tại');
    const result = await this.tokenService.revokeSessionTokens(accessToken, refreshToken);
    this.logger.log('Đăng xuất phiên hiện tại thành công');
    return result;
  }

  /**
   * 🔄 Refresh Access Token
   * SEC-8: Atomic consume + token family theft detection
   */
  async refreshAccessToken(refreshToken: string): Promise<{ success: boolean; accessToken: string; refreshToken: string }> {
    return this.tokenService.refreshAccessToken(refreshToken);
  }

  /**
   * 🛠️ Tạo Access Token (15m)
   */
  private createAccessToken(
    userId: string,
    email: string,
    role: string,
    fullName?: string,
    avatar?: string,
  ): string {
    const payload = {
      userId,
      email,
      role,
      fullName,
      avatar,
      type: TOKEN_TYPES.ACCESS, // ✅ Mark as access token
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 🔄 Tạo Refresh Token (7 days)
   */
  private createRefreshToken(userId: string): string {
    const payload = {
      userId,
      type: TOKEN_TYPES.REFRESH, // ✅ Mark as refresh token
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '7d',
    });
  }

  /**
   * 🔒 Băm token bằng SHA-256 (tất định) để lưu DB và tra cứu
   * NOTE: giữ method tại đây để minimize diff; token DB ops đang dần move → TokenService.
   */
  private hashToken(token: string): string {
    return this.tokenService.hashToken(token);
  }

  /**
   * 🛠️ Tạo và lưu cả Access + Refresh Token
   */
  private async createAndSaveTokens(
    userId: string,
    email: string,
    role: string,
    fullName?: string,
    avatar?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.tokenService.createAndSaveTokens(userId, email, role, fullName, avatar);
  }

  /**
   * 🛠️ Cách cũ - giữ lại để backward compatible
   */
  // private async createAndSaveToken(
  //   userId: string,
  //   email: string,
  //   role: string,
  //   fullName?: string,
  //   avatar?: string,
  // ): Promise<string> {
  //   try {
  //     const payload = {
  //       userId,
  //       email,
  //       role,
  //       fullName,
  //       avatar
  //     };

  //     const token = this.jwtService.sign(payload);

  //     await this.tokenModel.create({
  //       userId,
  //       email,
  //       role,
  //       token,
  //       deviceInfo: 'Web',
  //       status: true,
  //     });

  //     this.logger.debug(`🔑 Token đã được tạo và lưu cho userId: ${userId}`);
  //     return token;
  //   } catch (error) {
  //     const err = error as Error;
  //     this.logger.error(`❌ Error creating token: ${err.message}`, err.stack);
  //     throw new InternalServerErrorException('Cannot create authentication token');
  //   }
  // }

  async validateGoogleUser(profile: {
    emails?: { value: string }[];
    email?: string;
    id?: string;
    fullName?: string;
    photos?: { value: string }[];
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    return this.oauthService.validateGoogleUser(profile);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    return this.passwordResetService.requestPasswordReset(dto);
  }

  async verifyOtp(dto: VerifyOtpDto) {
    return this.passwordResetService.verifyOtp(dto);
  }

  async resetPasswordWithToken(dto: ResetPasswordWithTokenDto) {
    return this.passwordResetService.resetPasswordWithToken(dto);
  }

  async resetPasswordWithOtp(dto: ResetPasswordWithOtpDto) {
    return this.passwordResetService.resetPasswordWithOtp(dto);
  }

  /**
   * Tìm người dùng theo ID
   * @param userId ID của người dùng cần tìm
   * @returns Thông tin người dùng
   */
  async findUserById(userId: string): Promise<User> {
    try {
      const user = await this.usersService.getUserById(userId);

      if (!user) {
        this.logger.error(`User not found with ID: ${userId}`);
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      return user;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error finding user by ID: ${err.message}`);
      throw error;
    }
  }

  /**
   * Cập nhật vai trò tùy chỉnh cho người dùng
   * @param userId ID của người dùng
   * @param roleId ID của vai trò tùy chỉnh
   * @returns Thông tin người dùng sau khi cập nhật
   */
  async assignCustomRoleToUser(userId: string, roleId: string): Promise<User> {
    try {
      this.logger.log(`Assigning custom role ${roleId} to user ${userId}`);

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        this.logger.error(`User not found with ID: ${userId}`);
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Update user with the custom role
      await this.usersService.updateUser(userId, {
        roleId: new Types.ObjectId(roleId)
      });

      return await this.usersService.getUserById(userId);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error assigning custom role to user: ${err.message}`);
      throw error;
    }
  }

  /**
   * Xóa vai trò tùy chỉnh khỏi người dùng
   * @param userId ID của người dùng
   * @returns Thông tin người dùng sau khi cập nhật
   */
  async removeCustomRoleFromUser(userId: string): Promise<User> {
    try {
      this.logger.log(`Removing custom role from user ${userId}`);

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        this.logger.error(`User not found with ID: ${userId}`);
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Remove the custom role using $unset
      await this.usersService.updateUser(userId, {
        $unset: { roleId: "" }
      });

      return await this.usersService.getUserById(userId);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error removing custom role from user: ${err.message}`);
      throw error;
    }
  }
}
