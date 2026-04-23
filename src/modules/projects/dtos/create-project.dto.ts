import { IsString, IsOptional, IsEnum, MinLength, MaxLength, IsArray, ValidateNested, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ProjectMemberDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: ['lead', 'admin', 'member', 'viewer'] })
  @IsString()
  @IsIn(['lead', 'admin', 'member', 'viewer'])
  role!: string;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'My Project' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'MP' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  key!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ['scrum', 'kanban'], default: 'kanban' })
  @IsEnum(['scrum', 'kanban'])
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ type: [ProjectMemberDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberDto)
  members?: ProjectMemberDto[];
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['scrum', 'kanban'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['active', 'archived'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, any>;
}

export class AddMemberDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: ['lead', 'admin', 'member', 'viewer'] })
  @IsString()
  @IsIn(['lead', 'admin', 'member', 'viewer'])
  role!: string;
}

export class UpdateMemberDto {
  @ApiProperty({ enum: ['lead', 'admin', 'member', 'viewer'] })
  @IsString()
  @IsIn(['lead', 'admin', 'member', 'viewer'])
  role!: string;
}
