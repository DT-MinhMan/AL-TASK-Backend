import { IsString, IsOptional, IsEnum, MaxLength, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'How to Choose the Perfect Home' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: '<p>Rich HTML content here...</p>', description: 'Rich text HTML content' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ example: 'A comprehensive guide to selecting your dream home...' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ example: 'https://example.com/images/home.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: ['real estate', 'buying', 'tips'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsEnum(['true', 'false', true, false])
  featured?: boolean;

  @ApiPropertyOptional({ enum: ['draft', 'pending', 'published', 'rejected'], default: 'draft' })
  @IsOptional()
  @IsEnum(['draft', 'pending', 'published', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ enum: ['public', 'private'], default: 'public' })
  @IsOptional()
  @IsEnum(['public', 'private'])
  visibility?: string;

  @ApiPropertyOptional({ example: '2026-05-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
