import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SPACE_ROLES, SpaceRole } from '../../../common/constants/space-role.constants';

export class SpaceMemberDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: Object.values(SPACE_ROLES), default: SPACE_ROLES.MEMBER })
  @IsEnum(Object.values(SPACE_ROLES))
  role!: SpaceRole;
}

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add' })
  @IsString()
  userId!: string;

  @ApiProperty({ enum: Object.values(SPACE_ROLES), default: SPACE_ROLES.MEMBER })
  @IsEnum(Object.values(SPACE_ROLES))
  role!: SpaceRole;
}
