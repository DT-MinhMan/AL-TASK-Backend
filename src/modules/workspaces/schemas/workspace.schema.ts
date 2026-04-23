import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkspaceDocument = Workspace & Document;

@Schema({ timestamps: true })
export class Workspace {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'] } }], default: [] })
  members: { userId: Types.ObjectId; role: string }[];

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  readonly _id: Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
WorkspaceSchema.index({ slug: 1 }, { unique: true });
WorkspaceSchema.index({ 'members.userId': 1 });
