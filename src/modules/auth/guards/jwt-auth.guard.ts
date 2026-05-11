import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { TokenService } from '../services/token.service';
import { JWT_COOKIE_NAME } from '../../../config/cookie.config';

// Định nghĩa kiểu payload của JWT
interface JwtPayload {
  userId: string; // Đổi từ "id" thành "userId"
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Định nghĩa kiểu Request có user
interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    
    // ✅ Lấy token từ cookie (ưu tiên) hoặc Bearer header
    let token = request.cookies?.[JWT_COOKIE_NAME];
    
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      this.logger.warn('⚠️ Không tìm thấy token trong cookie hoặc authorization header.');
      throw new UnauthorizedException('Token không hợp lệ hoặc thiếu');
    }

    try {
      const decoded = this.jwtService.verify<JwtPayload>(token);
      const activeToken = await this.tokenService.findToken(token);

      if (!activeToken) {
        this.logger.warn(`⚠️ Token đã bị thu hồi hoặc không tồn tại: ID ${decoded.userId}`);
        throw new UnauthorizedException('Token đã bị thu hồi hoặc không còn hợp lệ');
      }

      if (activeToken.userId.toString() !== decoded.userId) {
        this.logger.warn(`⚠️ Token không khớp userId: ID ${decoded.userId}`);
        throw new UnauthorizedException('Token không hợp lệ');
      }

      request.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
      // Lưu user vào request để các middleware/controller khác có thể sử dụng
      this.logger.log(`✅ Xác thực thành công: ID ${decoded.userId}`);

      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`❌ Lỗi xác thực token: ${error.message}`);
      } else {
        this.logger.error(`❌ Lỗi xác thực token: Không xác định`);
      }
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
