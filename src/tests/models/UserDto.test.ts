/**
 * UserDto Tests
 * Tests for User DTO conversion and validation
 */

import {
   UserProfileDto,
   CreateUserProfileDto,
   UpdateUserProfileDto,
   toUserProfileDto,
   UserSession,
   AuthenticatedRequest,
} from '../../models/UserDto';
import { UserProfile as PrismaUserProfile } from '@prisma/client';

describe('UserDto', () => {
   const createMockPrismaUserProfile = (overrides = {}): PrismaUserProfile => {
      return {
         id: 'profile-id',
         userId: 'user-id',
         username: 'testuser',
         avatar: 'https://example.com/avatar.jpg',
         preferences: { theme: 'dark', language: 'en' },
         createdAt: new Date('2024-01-01'),
         updatedAt: new Date('2024-01-02'),
         ...overrides,
      };
   };

   const createMockUserProfileDto = (overrides = {}): UserProfileDto => {
      return {
         id: 'profile-id',
         userId: 'user-id',
         username: 'testuser',
         avatar: 'https://example.com/avatar.jpg',
         preferences: { theme: 'dark', language: 'en' },
         createdAt: new Date('2024-01-01'),
         updatedAt: new Date('2024-01-02'),
         ...overrides,
      };
   };

   const createMockUserSession = (overrides = {}): UserSession => {
      return {
         userId: 'user-id',
         username: 'testuser',
         sessionId: 'session-id',
         createdAt: new Date('2024-01-01'),
         lastAccessed: new Date('2024-01-02'),
         ...overrides,
      };
   };

   describe('toUserProfileDto', () => {
      it('should convert Prisma UserProfile to DTO with all fields', () => {
         const prismaProfile = createMockPrismaUserProfile();
         const result = toUserProfileDto(prismaProfile);

         expect(result.id).toBe(prismaProfile.id);
         expect(result.userId).toBe(prismaProfile.userId);
         expect(result.username).toBe(prismaProfile.username);
         expect(result.avatar).toBe(prismaProfile.avatar);
         expect(result.preferences).toEqual(prismaProfile.preferences);
         expect(result.createdAt).toEqual(prismaProfile.createdAt);
         expect(result.updatedAt).toEqual(prismaProfile.updatedAt);
      });

      it('should handle null optional fields by converting to undefined', () => {
         const prismaProfile = createMockPrismaUserProfile({
            avatar: null,
            preferences: null,
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.avatar).toBeUndefined();
         expect(result.preferences).toBeUndefined();
      });
   });

   describe('CreateUserProfileDto', () => {
      it('should create valid CreateUserProfileDto', () => {
         const createDto: CreateUserProfileDto = {
            userId: 'user-id',
            username: 'newuser',
            avatar: 'avatar.jpg',
            preferences: { theme: 'light' },
         };

         expect(createDto.userId).toBe('user-id');
         expect(createDto.username).toBe('newuser');
         expect(createDto.avatar).toBe('avatar.jpg');
      });
   });

   describe('UpdateUserProfileDto', () => {
      it('should accept app-local optional fields', () => {
         const updateDto: UpdateUserProfileDto = {
            username: 'updateduser',
            avatar: 'new-avatar.jpg',
            preferences: { theme: 'auto' },
         };

         expect(updateDto.username).toBe('updateduser');
         expect(updateDto.avatar).toBe('new-avatar.jpg');
         expect(updateDto.preferences?.theme).toBe('auto');
      });
   });

   describe('UserSession', () => {
      it('should create valid UserSession', () => {
         const session = createMockUserSession();

         expect(session.userId).toBe('user-id');
         expect(session.username).toBe('testuser');
         expect(session.sessionId).toBe('session-id');
      });
   });

   describe('AuthenticatedRequest', () => {
      it('should accept user and session context', () => {
         const request: AuthenticatedRequest = {
            user: createMockUserProfileDto(),
            session: createMockUserSession(),
         };

         expect(request.user?.username).toBe('testuser');
         expect(request.session?.sessionId).toBe('session-id');
      });
   });
});
