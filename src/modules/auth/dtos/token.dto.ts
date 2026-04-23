// src/modules/auth/dtos/token.dto.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TokenDocument = Token & Document;

@Schema({ timestamps: true })
export class Token {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Liên kết với bảng User

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ default: 'Unknown' })
  deviceInfo?: string; // Lưu thông tin thiết bị (tùy chọn)

  @Prop({ default: true })
  status?: boolean; // True: Đang đăng nhập, False: Đã đăng xuất

  @Prop({ default: Date.now })
  registerDate?: Date;

  @Prop({ default: Date.now, expires: '30d' })
  createdAt?: Date; // Token tự hết hạn sau 30 ngày
}

export const TokenSchema = SchemaFactory.createForClass(Token);
