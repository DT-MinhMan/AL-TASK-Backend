import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SPACE_ROLES } from '../../../common/constants/space-role.constants';

export type SpaceDocument = Space & Document;

@Schema()
export class SpaceMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(SPACE_ROLES), default: SPACE_ROLES.MEMBER })
  role: string;
}

@Schema({ timestamps: true })
export class Space {
  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  key: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: ['private', 'public'], default: 'public' })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: [SchemaFactory.createForClass(SpaceMember)], default: [] })
  members: SpaceMember[];

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  readonly _id: Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const SpaceSchema = SchemaFactory.createForClass(Space);
SpaceSchema.index({ workspaceId: 1 });
SpaceSchema.index({ 'members.userId': 1 });
