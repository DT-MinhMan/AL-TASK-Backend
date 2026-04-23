import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PropertyPostDocument = PropertyPost & Document;

@Schema()
export class PropertyLocation {
  @Prop()
  ward?: string;

  @Prop()
  district?: string;

  @Prop()
  city?: string;

  @Prop()
  address?: string;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;
}

@Schema()
export class PropertyDetails {
  @Prop()
  bedrooms?: number;

  @Prop()
  bathrooms?: number;

  @Prop()
  floors?: number;

  @Prop()
  width?: number;

  @Prop()
  length?: number;

  @Prop()
  area?: number;

  @Prop()
  direction?: string;

  @Prop()
  legalStatus?: string;

  @Prop()
  interior?: string;
}

@Schema({ timestamps: true })
export class PropertyPost {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  slug!: string;

  @Prop()
  content?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CategoryPost' })
  categoryId?: Types.ObjectId;

  @Prop({ type: String, enum: ['apartment', 'house', 'villa', 'townhouse', 'land', 'commercial', 'office', 'warehouse'], default: 'house' })
  propertyType!: string;

  @Prop({ type: String, enum: ['sale', 'rent'], required: true })
  listingType!: string;

  @Prop({ required: true, default: 0 })
  price!: number;

  @Prop()
  priceUnit?: string;

  @Prop({ type: PropertyLocation })
  location!: PropertyLocation;

  @Prop({ type: PropertyDetails })
  details!: PropertyDetails;

  @Prop({ type: [{ url: String, caption: String }], default: [] })
  images!: { url: string; caption?: string }[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Amenity' }], default: [] })
  amenities!: Types.ObjectId[];

  @Prop({ type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'pending' })
  status!: string;

  @Prop({ default: 0 })
  viewCount!: number;

  @Prop({ type: String, enum: ['available', 'sold', 'rented', 'pending'], default: 'available' })
  propertyStatus!: string;

  @Prop({ type: String, enum: ['public', 'private'], default: 'public' })
  visibility!: string;

  @Prop({ type: String })
  contactName?: string;

  @Prop({ type: String })
  contactPhone?: string;

  @Prop({ type: String })
  contactEmail?: string;

  @Prop()
  publishedAt?: Date;

  readonly _id!: Types.ObjectId;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
}

export const PropertyPostSchema = SchemaFactory.createForClass(PropertyPost);

PropertyPostSchema.index({ authorId: 1 });
PropertyPostSchema.index({ propertyType: 1 });
PropertyPostSchema.index({ listingType: 1 });
PropertyPostSchema.index({ price: 1 });
PropertyPostSchema.index({ status: 1 });
PropertyPostSchema.index({ 'location.city': 1 });
PropertyPostSchema.index({ 'location.district': 1 });
PropertyPostSchema.index({ title: 'text', content: 'text' });
