import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: ['task_assigned', 'task_updated', 'task_commented', 'task_mentioned', 'task_due', 'page_commented', 'page_mentioned', 'workspace_invite'] })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  message?: string;

  @Prop({ type: String, enum: ['task', 'page', 'workspace', 'project', 'sprint'] })
  targetType?: string;

  @Prop()
  targetId?: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Object, default: null })
  metadata?: Record<string, any>;

  readonly _id: Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
