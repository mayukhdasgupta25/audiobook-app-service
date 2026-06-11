export const AuthRole = {
   USER: 'USER',
   ADMIN: 'ADMIN',
   AUTHOR: 'AUTHOR',
} as const;

export type AuthRoleValue = (typeof AuthRole)[keyof typeof AuthRole];

export const AuthRoleGroups = {
   ADMIN_ONLY: [AuthRole.ADMIN],
   USER_ADMIN_AUTHOR: [AuthRole.USER, AuthRole.ADMIN, AuthRole.AUTHOR],
} as const;

export function normalizeAuthRole(role: string | undefined): string {
   return (role ?? '').trim().toLowerCase();
}

export function isGlobalAdminRole(role: string | undefined): boolean {
   return normalizeAuthRole(role) === normalizeAuthRole(AuthRole.ADMIN);
}
