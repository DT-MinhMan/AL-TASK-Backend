export const GLOBAL_ROLES = {
  SUPER_ADMIN: 'super_admin',
  USER: 'user',
} as const;

export type GlobalRole = (typeof GLOBAL_ROLES)[keyof typeof GLOBAL_ROLES];

export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  [GLOBAL_ROLES.SUPER_ADMIN]: 'Super Admin',
  [GLOBAL_ROLES.USER]: 'User',
};
