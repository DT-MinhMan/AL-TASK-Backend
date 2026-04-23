// src/modules/auth/services/token.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token, TokenDocument } from '../schemas/token.schema';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
  ) {}

  // ✅ Tạo và lưu token vào cơ sở dữ liệu
  async createAndSaveToken(
    userId: string,
    email: string,
    deviceInfo: string = 'Unknown',
  ): Promise<string> {
    this.logger.log(`🔑 Tạo token mới cho userId: ${userId}, email: ${email}`);

    try {
      const token = uuidv4();
      const newToken = new this.tokenModel({
        userId,
        email,
        token,
        deviceInfo,
        status: true,
      });

      await newToken.save();
      this.logger.log(`✅ Token được lưu thành công vào database: ${token}`);
      return token;
    } catch (error) {
      this.logger.error(`❌ Lỗi khi tạo token: ${error.message}`, error.stack);
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
      this.logger.error(`❌ Lỗi khi hủy token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Không thể hủy token.');
    }
  }

  // 🔍 Tìm token trong cơ sở dữ liệu
  async findToken(token: string): Promise<TokenDocument | null> {
    this.logger.log(`🔍 Tìm token trong database: ${token}`);
    try {
      return await this.tokenModel.findOne({ token, status: true }).exec();
    } catch (error) {
      this.logger.error(`❌ Lỗi khi tìm token: ${error.message}`, error.stack);
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
      this.logger.error(
        `❌ Lỗi khi hủy tất cả token của userId ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Không thể hủy tất cả token của người dùng.',
      );
    }
  }
}
