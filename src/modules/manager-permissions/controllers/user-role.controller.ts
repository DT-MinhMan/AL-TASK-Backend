import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/permission.decorator';
import { AuthService } from '../../auth/services/auth.service';
import { AssignRoleDto } from '../dtos/assign-role.dto';
import { RoleService } from '../services/role.service';

@Controller('user-roles')
export class UserRoleController {
  constructor(
    private readonly authService: AuthService,
    private readonly roleService: RoleService
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'update')
  async assignRoleToUser(@Body() assignRoleDto: AssignRoleDto) {
    const { userId, roleId } = assignRoleDto;

    // Verify that the role exists
    const role = await this.roleService.findById(roleId);

    // Assign the role to the user
    const updatedUser = await this.authService.assignCustomRoleToUser(userId, roleId);

    return {
      success: true,
      message: `Role '${role.name}' successfully assigned to user`,
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role,
        customRole: {
          id: roleId,
          name: role.name
        }
      }
    };
  }

  @Delete(':userId/role')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'delete')
  async removeRoleFromUser(@Param('userId') userId: string) {
    const updatedUser = await this.authService.removeCustomRoleFromUser(userId);

    return {
      success: true,
      message: 'Custom role successfully removed from user',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    };
  }

  @Get(':userId/role')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin')
  @RequirePermission('manager-permissions', 'read')
  async getUserRole(@Param('userId') userId: string) {
    const user = await this.authService.findUserById(userId);

    if (!user.roleId) {
      return {
        success: true,
        hasCustomRole: false,
        standardRole: user.role
      };
    }

    const role = await this.roleService.findById(user.roleId.toString());

    return {
      success: true,
      hasCustomRole: true,
      customRole: {
        id: user.roleId.toString(),
        name: role.name,
        description: role.description
      },
      standardRole: user.role
    };
  }
}