import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { USER_ROLES } from '../../../common/constants/user-roles.constants';
import { UsersService } from '../../users/services/users.service';
import { LoginDto, RegisterDto } from '../dtos/auth.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async checkEmail(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    return !user;
  }

  async register(registerDto: RegisterDto) {
    try {
      const existingUser = await this.usersService.findByEmail(registerDto.email);
      if (existingUser) {
        throw new ConflictException('Email đã được sử dụng');
      }

      await this.usersService.createUser({
        email: registerDto.email,
        password: registerDto.password,
        role: USER_ROLES.USER,
        status: 'active',
      });

      return {
        success: true,
        message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
        email: registerDto.email,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('Lỗi trong quá trình đăng ký:', err.message, err.stack);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
      }

      if (!user.password) {
        throw new UnauthorizedException(
          'Tài khoản này được đăng ký qua Google. Vui lòng đăng nhập bằng Google.',
        );
      }

      const isPasswordValid = await this.passwordService.verifyPassword(
        loginDto.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
      }

      const { accessToken, refreshToken } = await this.tokenService.createAndSaveTokens(
        user._id.toString(),
        user.email,
        user.role,
        user.fullName,
        user.avatar,
      );

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
      this.logger.error(`Lỗi khi đăng nhập: ${err.message}`, err.stack);
      throw error;
    }
  }
}
