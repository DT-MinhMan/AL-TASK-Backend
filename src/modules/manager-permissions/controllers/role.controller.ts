import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { UpdateRolePermissionsDto } from '../dtos/update-role-permissions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/permission.decorator';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'read')
  async getAllRoles() {
    return await this.roleService.findAll();
  }

  @Get('with-permissions')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'read')
  async getAllRolesWithPermissions() {
    return await this.roleService.getAllRolesWithPermissions();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'read')
  async getRoleById(@Param('id') id: string) {
    return await this.roleService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'create')
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return await this.roleService.create(createRoleDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'update')
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: Partial<CreateRoleDto>
  ) {
    return await this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'delete')
  async deleteRole(@Param('id') id: string) {
    return await this.roleService.delete(id);
  }

  @Get(':roleId/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'read')
  async getRolePermissions(@Param('roleId') roleId: string) {
    return await this.roleService.getRolePermissions(roleId);
  }

  @Put(':roleId/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'update')
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() updateDto: UpdateRolePermissionsDto
  ) {
    return await this.roleService.updateRolePermissions({
      roleId,
      permissionIds: updateDto.permissionIds
    });
  }
}