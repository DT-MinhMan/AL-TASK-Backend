import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpaceMemberDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ['admin', 'member'], default: 'member' })
  @IsEnum(['admin', 'member'])
  role: string;
}

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: ['admin', 'member'], default: 'member' })
  @IsEnum(['admin', 'member'])
  role: string;
}
