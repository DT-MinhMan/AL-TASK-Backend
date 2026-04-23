import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryPostDocument = CategoryPost & Document;

@Schema({ timestamps: true })
export class CategoryPost {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop()
  icon?: string;

  @Prop()
  image?: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'CategoryPost' })
  parentId?: Types.ObjectId;

  path?: string;

  @Prop({ default: 0 })
  level: number;

  readonly _id: Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const CategoryPostSchema = SchemaFactory.createForClass(CategoryPost);
CategoryPostSchema.index({ slug: 1 }, { unique: true });
CategoryPostSchema.index({ parentId: 1 });
CategoryPostSchema.index({ order: 1 });
