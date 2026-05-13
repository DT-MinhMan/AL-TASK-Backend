// src/modules/auth/schemas/security-event.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SecurityEventDocument = SecurityEvent & Document;

import type {
  SecurityEventSeverityLiteral,
  SecurityEventTypeLiteral,
} from '../constants/audit.constants';

export type SecurityEventType = SecurityEventTypeLiteral;
export type SecurityEventSeverity = SecurityEventSeverityLiteral;

@Schema({ timestamps: true, collection: 'security_events' })
export class SecurityEvent {
  @Prop({ type: String, required: true, index: true })
  type!: SecurityEventType;

  @Prop({ type: String, enum: ['INFO', 'WARN', 'CRITICAL'], required: true })
  severity!: SecurityEventSeverity;

  // userId nếu đã xác định được danh tính
  @Prop({ type: String, index: true })
  userId?: string;

  // email nếu có (không log password, token, OTP)
  @Prop({ type: String })
  email?: string;

  // IP address của request (từ proxy-aware header)
  @Prop({ type: String, index: true })
  ip?: string;

  @Prop({ type: String })
  userAgent?: string;

  // Metadata bổ sung — KHÔNG bao giờ chứa token/password/OTP
  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  // TTL: tự động xóa sau 90 ngày
  @Prop({ type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), expires: 0 })
  expiresAt!: Date;

  readonly createdAt!: Date;
}

export const SecurityEventSchema = SchemaFactory.createForClass(SecurityEvent);

// Index để query events theo user + type (incident investigation)
SecurityEventSchema.index({ userId: 1, type: 1, createdAt: -1 });
// Index để query CRITICAL events theo thời gian (monitoring dashboard)
SecurityEventSchema.index({ severity: 1, createdAt: -1 });
// Index để query events theo IP (brute-force analysis)
SecurityEventSchema.index({ ip: 1, createdAt: -1 });
