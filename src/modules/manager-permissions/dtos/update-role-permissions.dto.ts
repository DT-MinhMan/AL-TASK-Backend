import { IsArray, IsNotEmpty } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsNotEmpty()
  permissionIds: string[];
}