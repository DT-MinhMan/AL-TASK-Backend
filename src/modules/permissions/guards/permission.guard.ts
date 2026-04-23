import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../services/permissions.service';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { Auth } from '../../auth/schemas/auth.schema';
import { RoleService } from '../../manager-permissions/services/role.service';
import { getModelToken } from '@nestjs/mongoose';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
    private jwtService: JwtService,
    @Inject(getModelToken(Auth.name)) private authModel: Model<Auth>,
    @Inject(forwardRef(() => RoleService)) private roleService: RoleService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get permission requirements from metadata
    const permissionMeta = this.reflector.get('permission', context.getHandler());

    if (!permissionMeta) {
      return true; // No permission requirements
    }

    const { resource, action } = permissionMeta;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.id;

    if (!userId) {
      this.logger.debug('[PermissionGuard] No user ID found in request');
      this.logger.debug('[PermissionGuard] User object:', JSON.stringify(request.user));
      return false;
    }

    // Check if user has admin role
    if (request.user?.role === 'admin') {
      this.logger.debug('[PermissionGuard] User has admin role, access granted');
      return true;
    }

    // Check both direct and role-based permissions
    const hasPermission = await this.permissionsService.checkUserPermission(
      userId,
      resource,
      action
    );

    this.logger.debug(`[PermissionGuard] Checking permission: resource=${resource}, action=${action}, result=${hasPermission}`);
    return hasPermission;
  }
}