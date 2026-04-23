import { IsString, IsOptional, IsArray, ValidateNested, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BoardColumnDto {
  @IsString()
  id!: string;

  @IsString()
  @MaxLength(50)
  name!: string;

  @IsInt()
  order!: number;

  @IsOptional()
  @IsInt()
  wipLimit?: number;
}

export class UpdateBoardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardColumnDto)
  columns?: BoardColumnDto[];
}
