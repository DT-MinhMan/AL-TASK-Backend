import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

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

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('⚠️ Không tìm thấy token hoặc sai định dạng.');
      throw new UnauthorizedException('Token không hợp lệ hoặc thiếu');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = this.jwtService.verify<JwtPayload>(token);
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
