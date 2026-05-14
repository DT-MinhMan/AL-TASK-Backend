import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { RequirePermission } from '../../../common/decorators/permission.decorator';
import { UsersService } from '../../users/services/users.service';
import { AssignRoleDto } from '../dtos/assign-role.dto';
import { RoleService } from '../services/role.service';
import { Types } from 'mongoose';
import { GLOBAL_ROLES } from '../../../common/constants/global-role.constants';

@Controller('user-roles')
export class UserRoleController {
  constructor(
    private readonly usersService: UsersService,
    private readonly roleService: RoleService
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(GLOBAL_ROLES.SUPER_ADMIN)
  @RequirePermission('manager-permissions', 'update')
  async assignRoleToUser(@Body() assignRoleDto: AssignRoleDto) {
    const { userId, roleId } = assignRoleDto;

    // Verify that the role exists
    const role = await this.roleService.findById(roleId);

    // Assign the role to the user
    await this.usersService.updateUser(userId, {
      roleId: new Types.ObjectId(roleId),
    });
    const updatedUser = await this.usersService.getUserById(userId);

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
  @Roles(GLOBAL_ROLES.SUPER_ADMIN)
  @RequirePermission('manager-permissions', 'delete')
  async removeRoleFromUser(@Param('userId') userId: string) {
    await this.usersService.updateUser(userId, {
      $unset: { roleId: '' },
    });
    const updatedUser = await this.usersService.getUserById(userId);

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
  @Roles(GLOBAL_ROLES.SUPER_ADMIN)
  @RequirePermission('manager-permissions', 'read')
  async getUserRole(@Param('userId') userId: string) {
    const user = await this.usersService.getUserById(userId);

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
