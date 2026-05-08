import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateUsersDto } from '../dtos/create-users.dto';
import { UpdateUsersDto } from '../dtos/update-users.dto';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PermissionGuard } from 'src/modules/permissions/guards/permission.guard';
import { RequirePermission } from 'src/common/decorators/permission.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return await this.usersService.getUserById(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles('admin', 'manager')
  @RequirePermission('users', 'update')
  @Put('me')
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUsersDto) {
    if (updateUserDto.role && req.user.role === 'user') {
      throw new BadRequestException('Bạn không có quyền thay đổi role');
    }

    return await this.usersService.updateUser(req.user.userId, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @RequirePermission('users', 'update')
  @Roles('admin', 'manager')
  @Get()
  async getAllUsers() {
    return await this.usersService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @RequirePermission('users', 'read')
  @Roles('admin', 'manager', 'staff')
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return await this.usersService.getUserById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @RequirePermission('users', 'create')
  @Roles('admin', 'manager')
  @Post()
  async createUser(@Body() createUserDto: CreateUsersDto) {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại');
    }

    return await this.usersService.createUser(createUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @RequirePermission('users', 'update')
  @Roles('admin', 'manager')
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUsersDto) {
    return await this.usersService.updateUser(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @RequirePermission('users', 'delete')
  @Roles('admin')
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return await this.usersService.deleteUser(id);
  }
}
