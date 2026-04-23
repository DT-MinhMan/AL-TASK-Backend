import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BoardColumnDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  wipLimit?: number;
}

export class CreateBoardDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ type: [BoardColumnDto], default: [
    { id: 'todo', name: 'To Do', order: 0 },
    { id: 'inprogress', name: 'In Progress', order: 1 },
    { id: 'done', name: 'Done', order: 2 }
  ]})
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardColumnDto)
  columns?: BoardColumnDto[];
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
