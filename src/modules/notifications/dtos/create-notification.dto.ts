import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ['task_assigned', 'task_updated', 'task_commented', 'task_mentioned', 'task_due', 'page_commented', 'page_mentioned', 'workspace_invite'] })
  @IsEnum(['task_assigned', 'task_updated', 'task_commented', 'task_mentioned', 'task_due', 'page_commented', 'page_mentioned', 'workspace_invite'])
  type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ enum: ['task', 'page', 'workspace', 'project', 'sprint'] })
  @IsOptional()
  @IsEnum(['task', 'page', 'workspace', 'project', 'sprint'])
  targetType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
