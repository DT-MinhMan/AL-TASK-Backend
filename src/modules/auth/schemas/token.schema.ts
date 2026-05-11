import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TokenDocument = Token & Document;

@Schema({ timestamps: true })
export class Token {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ default: 'Unknown' })
  deviceInfo!: string;

  @Prop({ default: true })
  status!: boolean;

  @Prop({ type: Date, expires: 0 })
  expiresAt?: Date;

  readonly _id!: Types.ObjectId;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
