import {
   AuthRole,
   isGlobalAdminRole,
   isGlobalAuthorRole,
   isOrgAdminRole,
   isOrgCoordinatorRole,
   normalizeAuthRole,
} from '../../constants/authRoles';

describe('authRoles', () => {
   describe('normalizeAuthRole', () => {
      test('normalizes role case-insensitively', () => {
         expect(normalizeAuthRole('GLOBAL_ADMIN')).toBe('global_admin');
         expect(normalizeAuthRole(' global_admin ')).toBe('global_admin');
         expect(normalizeAuthRole(undefined)).toBe('');
      });
   });

   describe('isGlobalAdminRole', () => {
      test('returns true for GLOBAL_ADMIN and global_admin', () => {
         expect(isGlobalAdminRole(AuthRole.GLOBAL_ADMIN)).toBe(true);
         expect(isGlobalAdminRole('global_admin')).toBe(true);
      });

      test('returns false for LISTENER and AUTHOR', () => {
         expect(isGlobalAdminRole(AuthRole.LISTENER)).toBe(false);
         expect(isGlobalAdminRole(AuthRole.AUTHOR)).toBe(false);
      });
   });

   describe('isGlobalAuthorRole', () => {
      test('returns true for AUTHOR and author', () => {
         expect(isGlobalAuthorRole(AuthRole.AUTHOR)).toBe(true);
         expect(isGlobalAuthorRole('author')).toBe(true);
      });

      test('returns false for LISTENER and GLOBAL_ADMIN', () => {
         expect(isGlobalAuthorRole(AuthRole.LISTENER)).toBe(false);
         expect(isGlobalAuthorRole(AuthRole.GLOBAL_ADMIN)).toBe(false);
      });
   });

   describe('org staff role helpers', () => {
      test('isOrgAdminRole matches ORG_ADMIN only', () => {
         expect(isOrgAdminRole(AuthRole.ORG_ADMIN)).toBe(true);
         expect(isOrgAdminRole(AuthRole.GLOBAL_ADMIN)).toBe(false);
      });

      test('isOrgCoordinatorRole matches ORG_COORDINATOR only', () => {
         expect(isOrgCoordinatorRole(AuthRole.ORG_COORDINATOR)).toBe(true);
         expect(isOrgCoordinatorRole(AuthRole.ORG_ADMIN)).toBe(false);
      });
   });
});
