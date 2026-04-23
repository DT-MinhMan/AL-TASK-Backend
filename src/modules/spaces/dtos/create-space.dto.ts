import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpaceDto {
  @ApiProperty({ example: 'Development Docs' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'DEV' })
  @IsString()
  @MaxLength(10)
  key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ['private', 'public'], default: 'public' })
  @IsOptional()
  @IsEnum(['private', 'public'])
  type?: string;
}

export class UpdateSpaceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ['private', 'public'] })
  @IsOptional()
  @IsEnum(['private', 'public'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, any>;
}
