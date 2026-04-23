import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AmenityDocument = Amenity & Document;

@Schema({ timestamps: true })
export class Amenity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop()
  icon?: string;

  @Prop()
  category?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;

  readonly _id: any;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const AmenitySchema = SchemaFactory.createForClass(Amenity);
AmenitySchema.index({ category: 1 });
AmenitySchema.index({ order: 1 });
