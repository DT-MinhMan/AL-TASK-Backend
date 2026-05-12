import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TokenDocument = Token & Document;

export type TokenType = 'access' | 'refresh' | 'password-reset';

@Schema({ timestamps: true })
export class Token {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  email!: string;

  @Prop({ default: 'user' })
  role!: string;

  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ default: 'Unknown' })
  deviceInfo!: string;

  @Prop({ default: true })
  status!: boolean;

  @Prop({ type: String, enum: ['access', 'refresh', 'password-reset'], default: 'access' })
  type!: TokenType;



  @Prop({ type: Date, expires: 0 })
  expiresAt?: Date;

  readonly _id!: Types.ObjectId;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);

// ✅ Compound index: tối ưu truy vấn revoke theo userId + type + status
// Dùng cho: updateMany({ userId, type: 'access', status: true }, { status: false })
TokenSchema.index({ userId: 1, type: 1, status: 1 });

// ✅ Compound index: tối ưu truy vấn token lookup kết hợp status và type
// Dùng cho: findOne({ token: hash, status: true, type: 'refresh' })
// Lưu ý: token đã có unique index riêng, compound này hỗ trợ covered query
TokenSchema.index({ token: 1, status: 1, type: 1 });
