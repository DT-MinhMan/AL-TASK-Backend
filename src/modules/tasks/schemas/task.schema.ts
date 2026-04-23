import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema()
export class TaskAttachment {
  @Prop()
  id: string;
  
  @Prop()
  name: string;
  
  @Prop()
  url: string;
  
  @Prop()
  size: number;
  
  @Prop()
  mimeType: string;
  
  @Prop({ default: () => new Date() })
  uploadedAt: Date;
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Sprint' })
  sprintId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Board' })
  boardId?: Types.ObjectId;

  @Prop()
  boardColumnId?: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: String, enum: ['task', 'bug', 'story', 'epic'], default: 'task' })
  type: string;

  @Prop({ default: 'todo' })
  status: string;

  @Prop({ type: String, enum: ['lowest', 'low', 'medium', 'high', 'highest'], default: 'medium' })
  priority: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assigneeId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporterId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  labels: string[];

  @Prop({ type: [SchemaFactory.createForClass(TaskAttachment)], default: [] })
  attachments: TaskAttachment[];

  @Prop()
  storyPoints?: number;

  @Prop()
  dueDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  parentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  epicId?: Types.ObjectId;

  readonly _id: Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ sprintId: 1 });
TaskSchema.index({ boardId: 1, boardColumnId: 1 });
TaskSchema.index({ assigneeId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ type: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ parentId: 1 });
TaskSchema.index({ epicId: 1 });
TaskSchema.index({ labels: 1 });
TaskSchema.index({ title: 'text', description: 'text' });
