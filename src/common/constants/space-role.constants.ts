export const SPACE_ROLES = {
  SPACE_ADMIN: 'space_admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type SpaceRole = (typeof SPACE_ROLES)[keyof typeof SPACE_ROLES];

export const SPACE_ROLE_LABELS: Record<SpaceRole, string> = {
  [SPACE_ROLES.SPACE_ADMIN]: 'Space Admin',
  [SPACE_ROLES.MEMBER]: 'Member',
  [SPACE_ROLES.VIEWER]: 'Viewer',
};
