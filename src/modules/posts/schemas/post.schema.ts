import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  slug!: string;

  @Prop({ required: true })
  content!: string;

  @Prop()
  summary?: string;

  @Prop()
  thumbnail?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CategoryPost' })
  categoryId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ default: false })
  featured!: boolean;

  @Prop({ default: false })
  pinned!: boolean;

  @Prop({ type: String, enum: ['draft', 'pending', 'published', 'rejected'], default: 'draft' })
  status!: string;

  @Prop({ type: String, enum: ['public', 'private'], default: 'public' })
  visibility!: string;

  @Prop({ default: 0 })
  viewCount!: number;

  @Prop({ default: 0 })
  likeCount!: number;

  @Prop({ default: 0 })
  shareCount!: number;

  @Prop()
  publishedAt?: Date;

  @Prop()
  scheduledAt?: Date;

  readonly _id!: Types.ObjectId;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.index({ authorId: 1 });
PostSchema.index({ categoryId: 1 });
PostSchema.index({ status: 1 });
PostSchema.index({ publishedAt: -1 });
PostSchema.index({ title: 'text', summary: 'text', content: 'text' });
