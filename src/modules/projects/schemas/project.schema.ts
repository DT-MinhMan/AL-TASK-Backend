import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  key: string; // e.g. "PROJ", "TASK" - uppercase

  @Prop()
  description?: string;

  @Prop({ type: String, enum: ['scrum', 'kanban'], default: 'kanban' })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  leadId?: Types.ObjectId;

  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, role: { type: String, enum: ['lead', 'admin', 'member', 'viewer'] } }], default: [] })
  members: { userId: Types.ObjectId; role: string }[];

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  @Prop({ type: String, enum: ['active', 'archived'], default: 'active' })
  status: string;

  readonly _id: Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ workspaceId: 1 });
ProjectSchema.index({ 'members.userId': 1 });
