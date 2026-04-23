import { IsString, IsOptional, IsEnum, IsNumber, IsArray, MaxLength, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PropertyLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class PropertyDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  bedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  bathrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  floors?: number;

  @ApiPropertyOptional()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  length?: number;

  @ApiPropertyOptional()
  @IsOptional()
  area?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interior?: string;
}

export class CreatePropertyPostDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: ['apartment', 'house', 'villa', 'townhouse', 'land', 'commercial', 'office', 'warehouse'] })
  @IsEnum(['apartment', 'house', 'villa', 'townhouse', 'land', 'commercial', 'office', 'warehouse'])
  propertyType: string;

  @ApiProperty({ enum: ['sale', 'rent'] })
  @IsEnum(['sale', 'rent'])
  listingType: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceUnit?: string;

  @ApiPropertyOptional({ type: PropertyLocationDto })
  @IsOptional()
  location?: PropertyLocationDto;

  @ApiPropertyOptional({ type: PropertyDetailsDto })
  @IsOptional()
  details?: PropertyDetailsDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  images?: { url: string; caption?: string }[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  amenities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
}
