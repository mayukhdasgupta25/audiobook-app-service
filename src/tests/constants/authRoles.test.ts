import {
   AuthRole,
   isGlobalAdminRole,
   isGlobalAuthorRole,
   normalizeAuthRole,
} from '../../constants/authRoles';

describe('authRoles', () => {
   describe('normalizeAuthRole', () => {
      test('normalizes role case-insensitively', () => {
         expect(normalizeAuthRole('ADMIN')).toBe('admin');
         expect(normalizeAuthRole(' admin ')).toBe('admin');
         expect(normalizeAuthRole(undefined)).toBe('');
      });
   });

   describe('isGlobalAdminRole', () => {
      test('returns true for ADMIN and admin', () => {
         expect(isGlobalAdminRole(AuthRole.ADMIN)).toBe(true);
         expect(isGlobalAdminRole('admin')).toBe(true);
      });

      test('returns false for USER and AUTHOR', () => {
         expect(isGlobalAdminRole(AuthRole.USER)).toBe(false);
         expect(isGlobalAdminRole(AuthRole.AUTHOR)).toBe(false);
      });
   });

   describe('isGlobalAuthorRole', () => {
      test('returns true for AUTHOR and author', () => {
         expect(isGlobalAuthorRole(AuthRole.AUTHOR)).toBe(true);
         expect(isGlobalAuthorRole('author')).toBe(true);
      });

      test('returns false for USER and ADMIN', () => {
         expect(isGlobalAuthorRole(AuthRole.USER)).toBe(false);
         expect(isGlobalAuthorRole(AuthRole.ADMIN)).toBe(false);
      });
   });
});
