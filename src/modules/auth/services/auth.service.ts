// 📁 src/modules/auth/services/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token, TokenDocument } from '../dtos/token.dto';
import { VerifyService } from '../../verify/services/verify.service';
import { User } from '../../users/schemas/users.schema';
import { RequestPasswordResetDto, ResetPasswordWithTokenDto, ResetPasswordWithOtpDto, VerifyOtpDto } from '../dtos/password-reset.dto';
import { Otp, OtpDocument } from '../schemas/otp.schema';
import { randomBytes } from 'crypto';
import { PermissionsService } from '../../permissions/services/permissions.service';
import { Permission } from 'src/modules/permissions/schemas/permission.schema';
import { Auth } from '../schemas/auth.schema';
import { Types } from 'mongoose';

// Define permission interface
interface PermissionInfo {
  id: string;
  resource: string;
  action: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    @InjectModel(Auth.name) private readonly authModel: Model<Auth>,
    private readonly verifyService: VerifyService,
    private readonly permissionsService: PermissionsService,
  ) { }

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
        ...registerDto,
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
   * 🔐 Đăng nhập người dùng
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

      // Tạo token và lưu vào database
      const token = await this.createAndSaveToken(
        user._id.toString(),
        user.email,
        user.role,
        user.fullName,
        user.avatar
      );

      return {
        success: true,
        message: 'Đăng nhập thành công',
        token,
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
   * 🚪 Đăng xuất người dùng
   */
  async logout(userId: string): Promise<{ message: string }> {
    this.logger.log(`🚪 Đang đăng xuất người dùng với ID: ${userId}`);
    try {
      await this.tokenModel.updateMany({ userId }, { status: false });
      this.logger.log(`✅ Đăng xuất thành công cho ID: ${userId}`);
      return { message: 'Đăng xuất thành công' };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`❌ Lỗi khi đăng xuất: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Lỗi khi đăng xuất người dùng.');
    }
  }

  /**
   * 🛠️ Hàm tạo và lưu token vào MongoDB
   */
  private async createAndSaveToken(
    userId: string,
    email: string,
    role: string,
    fullName?: string,
    avatar?: string,
  ): Promise<string> {
    try {
      // ✅ Tối ưu: Không lưu permissions vào JWT token
      // Chỉ lưu thông tin cần thiết: userId, email, role, fullName, avatar
      const payload = {
        userId,
        email,
        role,
        fullName,
        avatar
      };

      // ✅ Sign JWT với payload tối giản
      const token = this.jwtService.sign(payload);

      await this.tokenModel.create({
        userId,
        email,
        role,
        token,
        deviceInfo: 'Web',
        status: true,
      });

      this.logger.debug(`🔑 Token đã được tạo và lưu cho userId: ${userId}`);
      return token;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Error creating token: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Cannot create authentication token');
    }
  }

  async validateGoogleUser(profile: {
    emails?: { value: string }[];
    email?: string;
    id?: string;
    fullName?: string;
    photos?: { value: string }[];
  }): Promise<{ user: User; token: string }> {
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

      // 🛠 Tạo và lưu token sử dụng MongoDB _id
      const token = await this.createAndSaveToken(
        currentUser._id.toString(),
        currentUser.email,
        currentUser.role,
        currentUser.fullName,
        currentUser.avatar
      );

      return { user: currentUser, token };
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
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Email không tồn tại trong hệ thống');
    }

    // Tạo token đặt lại mật khẩu
    const resetToken = this.jwtService.sign(
      { email: dto.email, type: 'password-reset' },
      { expiresIn: '15m' },
    );

    // Lưu token vào database
    await this.tokenModel.create({
      userId: user._id,
      email: user.email,
      token: resetToken,
      deviceInfo: 'Password Reset',
      status: true,
    });

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu OTP vào database với thời hạn 15 phút
    await this.otpModel.create({
      email: dto.email,
      code: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isUsed: false,
    });

    // Gửi email chứa cả link và OTP
    await this.verifyService.sendPasswordResetEmail(dto.email, resetToken, otp);

    return {
      success: true,
      message: 'Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn',
    };
  }

  /**
   * ✅ Xác thực OTP
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.otpModel.findOne({
      email: dto.email,
      code: dto.otp,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
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
      // Xác thực token
      const payload = this.jwtService.verify(dto.token);
      if (!payload || payload.type !== 'password-reset') {
        throw new BadRequestException('Token không hợp lệ');
      }

      // Kiểm tra token trong database
      const tokenRecord = await this.tokenModel.findOne({
        token: dto.token,
        status: true,
      });

      if (!tokenRecord) {
        throw new BadRequestException('Token không hợp lệ hoặc đã được sử dụng');
      }

      // Cập nhật mật khẩu
      const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
      await this.usersService.updatePassword(tokenRecord.email, hashedPassword);

      // Vô hiệu hóa token
      await this.tokenModel.updateOne(
        { token: dto.token },
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
    // Xác thực OTP
    const otpRecord = await this.otpModel.findOne({
      email: dto.email,
      code: dto.otp,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
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
