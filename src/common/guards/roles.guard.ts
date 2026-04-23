import { Injectable, CanActivate, ExecutionContext, forwardRef, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PermissionsService } from '../../modules/permissions/services/permissions.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Auth } from '../../modules/auth/schemas/auth.schema';
import { getModelToken } from '@nestjs/mongoose';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
    @Inject(getModelToken(Auth.name)) private authModel: Model<Auth>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    // If user has admin role, allow access
    if (user.role === 'admin') {
      return true;
    }

    // Get permission requirements from metadata
    const permissionMeta = this.reflector.get('permission', context.getHandler());
    if (!permissionMeta) {
      // No permission requirements specified, check roles only
      if (!requiredRoles) {
        return true; // No roles or permissions required
      }
      return requiredRoles.some(role => user.role === role);
    }

    const { resource, action } = permissionMeta;

    try {
      // Check if user has the required permission
      const hasPermission = await this.permissionsService.checkUserPermission(
        user.userId,
        resource,
        action
      );

      return hasPermission;
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false;
    }
  }
}
