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
  userId: string;
  email?: string;
  role?: string;
  type?: string;
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
      
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('⚠️ Không tìm thấy token hoặc sai định dạng.');
      throw new UnauthorizedException('Token không hợp lệ hoặc thiếu');
    }

    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify<JwtPayload>(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          // ⚡ Client cần gọi POST /auth/refresh để lấy access token mới
          this.logger.warn(`⚠️ Access token đã hết hạn - yêu cầu refresh`);
          throw new UnauthorizedException({
            statusCode: 401,
            error: 'TOKEN_EXPIRED',
            message: 'Access token đã hết hạn, vui lòng gọi /auth/refresh',
          });
        }
        this.logger.error(`❌ Token không hợp lệ: ${error.message}`);
      }
      throw new UnauthorizedException('Token không hợp lệ');
    }

    // ✅ Chỉ chấp nhận access token (không nhận refresh token)
    if (decoded.type && decoded.type !== 'access') {
      this.logger.warn(`⚠️ Loại token không đúng: ${decoded.type}`);
      throw new UnauthorizedException('Chỉ sử dụng access token cho endpoint này');
    }

    const activeToken = await this.tokenService.findToken(token);
    if (!activeToken) {
      this.logger.warn(`⚠️ Token đã bị thu hồi hoặc không tồn tại: userId ${decoded.userId}`);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'TOKEN_REVOKED',
        message: 'Token đã bị thu hồi hoặc không còn hợp lệ',
      });
    }

    if (activeToken.userId.toString() !== decoded.userId) {
      this.logger.warn(`⚠️ Token không khớp userId: ${decoded.userId}`);
      throw new UnauthorizedException('Token không hợp lệ');
    }

    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    this.logger.log(`✅ Xác thực thành công: userId ${decoded.userId}`);
    return true;
  }
}
