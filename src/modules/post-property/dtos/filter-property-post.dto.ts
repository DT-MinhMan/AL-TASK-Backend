import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterPropertyPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['apartment', 'house', 'villa', 'townhouse', 'land', 'commercial', 'office', 'warehouse'] })
  @IsOptional()
  @IsEnum(['apartment', 'house', 'villa', 'townhouse', 'land', 'commercial', 'office', 'warehouse'])
  propertyType?: string;

  @ApiPropertyOptional({ enum: ['sale', 'rent'] })
  @IsOptional()
  @IsEnum(['sale', 'rent'])
  listingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ enum: ['available', 'sold', 'rented', 'pending'] })
  @IsOptional()
  @IsEnum(['available', 'sold', 'rented', 'pending'])
  propertyStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
