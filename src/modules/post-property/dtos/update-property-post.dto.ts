import { IsString, IsOptional, IsEnum, IsNumber, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyLocationDto, PropertyDetailsDto } from './create-property-post.dto';

export class UpdatePropertyPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['apartment', 'house', 'villa', 'townhouse', 'land', 'commercial', 'office', 'warehouse'])
  propertyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['sale', 'rent'])
  listingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  location?: PropertyLocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  details?: PropertyDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  images?: { url: string; caption?: string }[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  amenities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['draft', 'pending', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['available', 'sold', 'rented', 'pending'])
  propertyStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
}
