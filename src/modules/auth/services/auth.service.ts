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
import { Token, TokenDocument } from '../schemas/token.schema';
import { VerifyService } from '../../verify/services/verify.service';
import { User } from '../../users/schemas/users.schema';
import { RequestPasswordResetDto, ResetPasswordWithTokenDto, ResetPasswordWithOtpDto, VerifyOtpDto } from '../dtos/password-reset.dto';
import { Otp, OtpDocument } from '../schemas/otp.schema';
import { randomBytes, createHash, randomInt } from 'crypto';
import { PermissionsService } from '../../permissions/services/permissions.service';
import { Permission } from 'src/modules/permissions/schemas/permission.schema';
import { Auth } from '../schemas/auth.schema';
import { Types } from 'mongoose';
import { AuditLogService } from './audit-log.service';

// Define permission interface
interface PermissionInfo {
  id: string;
  resource: string;
  action: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    private readonly verifyService: VerifyService,
    private readonly permissionsService: PermissionsService,
    private readonly auditLogService: AuditLogService,
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

      // ✅ Return cả 2 tokens (controller sẽ set vào cookies)
      return {
        success: true,
        message: 'Đăng nhập thành công',
        accessToken,
        refreshToken,
        user: {
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
    if (!accessToken && !refreshToken) {
      throw new UnauthorizedException('Token không hợp lệ hoặc thiếu');
    }

    try {
      const hashedTokens = ([accessToken, refreshToken].filter(Boolean) as string[])
        .map(t => this.hashToken(t));
      await this.tokenModel.updateMany(
        { token: { $in: hashedTokens } },
        { status: false }
      );
      this.logger.log('Đăng xuất phiên hiện tại thành công');
      return { message: 'Đăng xuất thành công' };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Lỗi khi đăng xuất: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Lỗi khi đăng xuất người dùng.');
    }
  }

  /**
   * 🔄 Refresh Access Token
   * SEC-8: Atomic consume + token family theft detection
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // 1. Verify JWT signature (cheap, no DB hit)
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      }) as any;

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Token không phải là refresh token');
      }

      // 2. SEC-8 + TOCTOU fix: Atomically mark token as consumed
      //    findOneAndUpdate chỉ trả về doc nếu tìm thấy với status: true
      //    Hai request đồng thời: request đầu thành công, request sau nhận null → không race
      const consumed = await this.tokenModel.findOneAndUpdate(
        { token: this.hashToken(refreshToken), status: true, type: 'refresh' },
        { $set: { status: false } },
        { new: false }, // trả về document TRƯỚC khi update
      );

      if (!consumed) {
        // Token không active — kiểm tra xem có bị reuse không (SEC-8 theft detection)
        const revokedToken = await this.tokenModel.findOne({
          token: this.hashToken(refreshToken),
          status: false,
          type: 'refresh',
        });

        if (revokedToken?.familyId) {
          // Grace period 15s để tránh false-positive với concurrent refresh từ cùng client
          const revokedAgeMs = Date.now() - revokedToken.updatedAt.getTime();
          const CONCURRENT_GRACE_MS = 15_000;

          if (revokedAgeMs > CONCURRENT_GRACE_MS) {
            // Revoke toàn bộ family — buộc re-login trên tất cả thiết bị
            await this.tokenModel.updateMany(
              { familyId: revokedToken.familyId, status: true },
              { $set: { status: false } },
            );
            this.logger.error(
              `🚨 REFRESH TOKEN THEFT DETECTED — familyId: ${revokedToken.familyId}, userId: ${revokedToken.userId}`,
            );
            this.auditLogService.log({
              type: 'TOKEN_FAMILY_REVOKED',
              severity: 'CRITICAL',
              userId: revokedToken.userId?.toString(),
              metadata: { familyId: revokedToken.familyId, revokedAgeMs },
            });
            throw new UnauthorizedException({
              statusCode: 401,
              error: 'TOKEN_FAMILY_REVOKED',
              message:
                'Phiên đăng nhập bị thu hồi do phát hiện dấu hiệu bất thường. Vui lòng đăng nhập lại.',
            });
          }

          // Trong grace period — có thể là concurrent request, vẫn ghi cảnh báo
          this.auditLogService.log({
            type: 'REFRESH_REUSED',
            severity: 'WARN',
            userId: revokedToken.userId?.toString(),
            metadata: { familyId: revokedToken.familyId, revokedAgeMs, withinGrace: true },
          });
        }

        throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
      }

      // 3. Get user info
      const user = await this.usersService.getUserById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException('User không tồn tại');
      }

      // 4. Revoke old access tokens
      await this.tokenModel.updateMany(
        { userId: decoded.userId, type: 'access', status: true },
        { $set: { status: false } },
      );

      // 5. Issue new tokens
      const newAccessToken = this.createAccessToken(
        user._id.toString(),
        user.email,
        user.role,
        user.fullName,
        user.avatar,
      );
      const newRefreshToken = this.createRefreshToken(user._id.toString());

      // 6. Inherit familyId từ token vừa consumed (kế thừa chain)
      const familyId = consumed.familyId ?? randomBytes(16).toString('hex');

      const accessExpiry  = new Date(Date.now() + 15 * 60 * 1000);          // 15m
      const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

      await this.tokenModel.create({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        token: this.hashToken(newAccessToken),
        deviceInfo: 'Web',
        status: true,
        type: 'access',
        expiresAt: accessExpiry,
      });

      await this.tokenModel.create({
        userId: user._id.toString(),
        email: user.email,
        token: this.hashToken(newRefreshToken),
        deviceInfo: 'Web',
        status: true,
        type: 'refresh',
        familyId,
        expiresAt: refreshExpiry,
      });

      this.logger.debug(`🔄 Token rotated — userId: ${decoded.userId}, family: ${familyId}`);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token đã hết hạn, vui lòng đăng nhập lại');
      }
      this.logger.error(`❌ Lỗi khi refresh token: ${err.message}`, err.stack);
      throw error;
    }
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
      type: 'access', // ✅ Mark as access token
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 🔄 Tạo Refresh Token (7 days)
   */
  private createRefreshToken(userId: string): string {
    const payload = {
      userId,
      type: 'refresh', // ✅ Mark as refresh token
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '7d',
    });
  }

  /**
   * 🔒 Băm token bằng SHA-256 (tất định) để lưu DB và tra cứu
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
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
    try {
      // ✅ Tạo access token (15m)
      const accessToken = this.createAccessToken(userId, email, role, fullName, avatar);

      // ✅ Tạo refresh token (7d)
      const refreshToken = this.createRefreshToken(userId);

      // SEC-8: familyId mới cho mỗi login session
      const familyId = randomBytes(16).toString('hex');

      const accessExpiry  = new Date(Date.now() + 15 * 60 * 1000);          // 15m
      const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

      // ✅ Lưu access token vào database (chỉ lưu hash)
      await this.tokenModel.create({
        userId,
        email,
        role,
        token: this.hashToken(accessToken),
        deviceInfo: 'Web',
        status: true,
        type: 'access',
        expiresAt: accessExpiry,
      });

      // ✅ Lưu refresh token vào database (chỉ lưu hash + familyId mới)
      await this.tokenModel.create({
        userId,
        email,
        token: this.hashToken(refreshToken),
        deviceInfo: 'Web',
        status: true,
        type: 'refresh',
        familyId,
        expiresAt: refreshExpiry,
      });

      this.logger.debug(`🔑 Tokens đã được tạo và lưu cho userId: ${userId}, family: ${familyId}`);
      return { accessToken, refreshToken };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error creating tokens: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Cannot create authentication tokens');
    }
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

  // Phase 3: return type aligned với standard login (access + refresh token)
  async validateGoogleUser(profile: {
    emails?: { value: string }[];
    email?: string;
    id?: string;
    fullName?: string;
    photos?: { value: string }[];
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    if (!profile || typeof profile !== 'object') {
      throw new BadRequestException(
        'Lỗi xác thực Google: Dữ liệu không hợp lệ',
      );
    }

    try {
      // 📩 Lấy email
      const email: string | undefined =
        profile.emails?.[0]?.value || profile.email;
      if (!email) {
        throw new BadRequestException('Không tìm thấy email từ Google');
      }

      // 🆔 Lấy Google ID
      const googleId: string = profile.id ?? '';
      if (!googleId) {
        throw new BadRequestException('Không tìm thấy Google ID');
      }

      // 📛 Lấy tên đầy đủ từ Google profile
      const fullName: string = profile.fullName ?? '';

      // 🖼️ Lấy ảnh đại diện
      const avatar: string = profile.photos?.[0]?.value ?? '';

      // 🔍 Kiểm tra user có tồn tại không
      let currentUser = await this.usersService.findByEmail(email);

      if (currentUser) {
        // Update existing user's Google info if needed
        if (!currentUser.googleId || currentUser.googleId !== googleId) {
          const updatedUser = await this.usersService.updateUser(currentUser._id.toString(), {
            googleId,
            avatar: avatar || currentUser.avatar,
            fullName: fullName || currentUser.fullName
          });

          if (!updatedUser) {
            throw new BadRequestException('Không thể cập nhật thông tin người dùng');
          }

          currentUser = updatedUser;
        }
      } else {
        // Create new user
        this.logger.log('🆕 Tạo user mới:', email);
        const newUser = await this.usersService.createUser({
          googleId,
          password: '', // Google users don't need password
          email,
          fullName,
          avatar,
          role: 'user',
          status: 'active',
        });

        if (!newUser) {
          throw new BadRequestException('Không thể tạo user mới');
        }

        currentUser = newUser;
      }

      // Ensure user exists at this point
      if (!currentUser) {
        throw new BadRequestException('Lỗi xử lý thông tin người dùng');
      }

      // Phase 3: issue access + refresh token pair — đồng nhất với login thường
      const { accessToken, refreshToken } = await this.createAndSaveTokens(
        currentUser._id.toString(),
        currentUser.email,
        currentUser.role,
        currentUser.fullName,
        currentUser.avatar,
      );

      return { user: currentUser, accessToken, refreshToken };
    } catch (error) {
      this.logger.error('❌ Lỗi trong quá trình xác thực Google:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Lỗi trong quá trình xác thực Google');
    }
  }

  /**
   * 🔄 Yêu cầu đặt lại mật khẩu
   */
  async requestPasswordReset(dto: RequestPasswordResetDto) {
    // SEC-7: Trả generic message — không tiết lộ email có tồn tại hay không
    const GENERIC_RESPONSE = {
      success: true,
      message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
    };

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return GENERIC_RESPONSE;
    }

    // SEC-10: Ký reset token bằng PASSWORD_RESET_SECRET riêng
    const resetToken = this.jwtService.sign(
      { email: dto.email, type: 'password-reset' },
      {
        secret: this.configService.get<string>('PASSWORD_RESET_SECRET'),
        expiresIn: '15m',
      },
    );

    // Lưu token vào database — hash trước khi lưu (nhất quán với access/refresh)
    await this.tokenModel.create({
      userId: user._id,
      email: user.email,
      token: this.hashToken(resetToken),
      deviceInfo: 'Password Reset',
      status: true,
      type: 'password-reset',
    });

    // SEC-5: OTP cryptographically secure với randomInt
    const otp = randomInt(100000, 1000000).toString();

    // SEC-6: Hash OTP trước khi lưu DB
    const hashedOtp = await bcrypt.hash(otp, 10);

    await this.otpModel.create({
      email: dto.email,
      code: hashedOtp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isUsed: false,
    });

    // Chỉ gửi OTP plaintext qua email — không bao giờ trả về API response
    await this.verifyService.sendPasswordResetEmail(dto.email, resetToken, otp);

    return GENERIC_RESPONSE;
  }

  /**
   * ✅ Xác thực OTP
   */
  async verifyOtp(dto: VerifyOtpDto) {
    // SEC-6: Fetch bằng email/status — so sánh bằng bcrypt.compare (không query plaintext)
    const otpRecord = await this.otpModel
      .findOne({ email: dto.email, isUsed: false, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .exec();

    const isValid = otpRecord && (await bcrypt.compare(dto.otp, otpRecord.code));
    if (!isValid) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    return {
      success: true,
      message: 'Xác thực OTP thành công',
    };
  }

  /**
   * 🔑 Đặt lại mật khẩu với token
   */
  async resetPasswordWithToken(dto: ResetPasswordWithTokenDto) {
    try {
      // SEC-10: Xác thực bằng PASSWORD_RESET_SECRET riêng
      const payload = this.jwtService.verify(dto.token, {
        secret: this.configService.get<string>('PASSWORD_RESET_SECRET'),
      });
      if (!payload || payload.type !== 'password-reset') {
        throw new BadRequestException('Token không hợp lệ');
      }

      // Kiểm tra token trong database — query bằng hash (nhất quán với access/refresh)
      const tokenRecord = await this.tokenModel.findOne({
        token: this.hashToken(dto.token),
        status: true,
        type: 'password-reset',
      });

      if (!tokenRecord) {
        throw new BadRequestException('Token không hợp lệ hoặc đã được sử dụng');
      }

      // Cập nhật mật khẩu
      const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
      await this.usersService.updatePassword(tokenRecord.email, hashedPassword);

      // Vô hiệu hóa token — revoke bằng hash
      await this.tokenModel.updateOne(
        { token: this.hashToken(dto.token) },
        { status: false },
      );

      return {
        success: true,
        message: 'Đặt lại mật khẩu thành công',
      };
    } catch (error) {
      const err = error as Error;
      if (err.name === 'JsonWebTokenError') {
        throw new BadRequestException('Token không hợp lệ');
      }
      if (err.name === 'TokenExpiredError') {
        throw new BadRequestException('Token đã hết hạn');
      }
      throw error;
    }
  }

  /**
   * 🔑 Đặt lại mật khẩu với OTP
   */
  async resetPasswordWithOtp(dto: ResetPasswordWithOtpDto) {
    // SEC-6: Fetch bằng email/status — so sánh bằng bcrypt.compare (không query plaintext)
    const otpRecord = await this.otpModel
      .findOne({ email: dto.email, isUsed: false, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .exec();

    const isValid = otpRecord && (await bcrypt.compare(dto.otp, otpRecord.code));
    if (!isValid) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Cập nhật mật khẩu
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(dto.email, hashedPassword);

    // Đánh dấu OTP đã sử dụng
    await this.otpModel.updateOne(
      { _id: otpRecord._id },
      { isUsed: true },
    );

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công',
    };
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
