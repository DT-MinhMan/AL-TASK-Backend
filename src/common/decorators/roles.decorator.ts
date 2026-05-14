// Custom Decorators (Check quyền)

import { SetMetadata } from '@nestjs/common';
import { GlobalRole } from '../constants/global-role.constants';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles);
