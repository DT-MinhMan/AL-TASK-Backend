// src/modules/auth/services/token.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token, TokenDocument } from '../schemas/token.schema';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ✅ Tạo và lưu token vào cơ sở dữ liệu
  async createAndSaveToken(
    userId: string,
    email: string,
    role: string,
    fullName?: string,
    avatar?: string,
    deviceInfo: string = 'Web',
  ): Promise<string> {
    this.logger.log(`🔑 Tạo token mới cho userId: ${userId}, email: ${email}`);

    try {
      const payload = {
        userId,
        email,
        role,
        fullName,
        avatar,
      };

      const token = this.jwtService.sign(payload);

      // Tính toán thời gian hết hạn (ví dụ: 7 ngày)
      const expiresInDays = parseInt(this.configService.get<string>('JWT_EXPIRES_IN_DAYS') || '7');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const newToken = new this.tokenModel({
        userId,
        email,
        token,
        deviceInfo,
        status: true,
        expiresAt,
      });

      await newToken.save();
      this.logger.log(`✅ Token được lưu thành công vào database cho user: ${email}`);
      return token;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Lỗi khi tạo token: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Không thể tạo token.');
    }
  }

  // 🚪 Đăng xuất và hủy token
  async invalidateToken(token: string): Promise<void> {
    this.logger.log(`🚪 Hủy token: ${token}`);
    try {
      await this.tokenModel.updateOne({ token }, { status: false });
      this.logger.log(`✅ Token đã được hủy: ${token}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Lỗi khi hủy token: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Không thể hủy token.');
    }
  }

  // 🔍 Tìm token trong cơ sở dữ liệu
  async findToken(token: string): Promise<TokenDocument | null> {
    this.logger.log(`🔍 Tìm token trong database: ${token}`);
    try {
      return await this.tokenModel
        .findOne({
          token,
          status: true,
          expiresAt: { $gt: new Date() }, // ✅ Chỉ lấy token chưa hết hạn
        })
        .exec();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Lỗi khi tìm token: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Không thể tìm thấy token.');
    }
  }

  // 📤 Xóa tất cả token của người dùng (Ví dụ khi đăng xuất tất cả thiết bị)
  async invalidateAllTokensForUser(userId: string): Promise<void> {
    this.logger.log(`📤 Hủy tất cả token của userId: ${userId}`);
    try {
      await this.tokenModel.updateMany({ userId }, { status: false });
      this.logger.log(`✅ Tất cả token của userId ${userId} đã bị hủy`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `❌ Lỗi khi hủy tất cả token của userId ${userId}: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException(
        'Không thể hủy tất cả token của người dùng.',
      );
    }
  }
}
