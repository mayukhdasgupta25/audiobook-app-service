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
   // Mock factory for creating test data
   const createMockPrismaUserProfile = (overrides = {}): PrismaUserProfile => {
      return {
         id: 'profile-id',
         userId: 'user-id',
         username: 'testuser',
         firstName: 'Test',
         lastName: 'User',
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
         firstName: 'Test',
         lastName: 'User',
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
         expect(result.firstName).toBe(prismaProfile.firstName);
         expect(result.lastName).toBe(prismaProfile.lastName);
         expect(result.avatar).toBe(prismaProfile.avatar);
         expect(result.preferences).toEqual(prismaProfile.preferences);
         expect(result.createdAt).toEqual(prismaProfile.createdAt);
         expect(result.updatedAt).toEqual(prismaProfile.updatedAt);
      });

      it('should handle null optional fields by converting to undefined', () => {
         const prismaProfile = createMockPrismaUserProfile({
            firstName: null,
            lastName: null,
            avatar: null,
            preferences: null,
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.firstName).toBeUndefined();
         expect(result.lastName).toBeUndefined();
         expect(result.avatar).toBeUndefined();
         expect(result.preferences).toBeUndefined();
      });

      it('should handle complex preferences object', () => {
         const complexPreferences = {
            theme: 'dark',
            language: 'en',
            notifications: {
               email: true,
               push: false,
            },
            playback: {
               speed: 1.5,
               volume: 75,
            },
         };

         const prismaProfile = createMockPrismaUserProfile({
            preferences: complexPreferences as any,
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.preferences).toEqual(complexPreferences);
      });

      it('should handle empty preferences object', () => {
         const prismaProfile = createMockPrismaUserProfile({
            preferences: {},
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.preferences).toEqual({});
      });
   });

   describe('CreateUserProfileDto', () => {
      it('should create valid CreateUserProfileDto', () => {
         const createDto: CreateUserProfileDto = {
            userId: 'user-id',
            username: 'newuser',
            firstName: 'New',
            lastName: 'User',
            avatar: 'avatar.jpg',
            preferences: { theme: 'light' },
         };

         expect(createDto.userId).toBe('user-id');
         expect(createDto.username).toBe('newuser');
         expect(createDto.firstName).toBe('New');
         expect(createDto.lastName).toBe('User');
         expect(createDto.avatar).toBe('avatar.jpg');
         expect(createDto.preferences?.theme).toBe('light');
      });

      it('should require userId and username', () => {
         const createDto: CreateUserProfileDto = {
            userId: 'user-id',
            username: 'required',
         };

         expect(createDto.userId).toBeDefined();
         expect(createDto.username).toBeDefined();
      });

      it('should handle all optional fields', () => {
         const minimalDto: CreateUserProfileDto = {
            userId: 'user-id',
            username: 'username',
         };

         expect(minimalDto.firstName).toBeUndefined();
         expect(minimalDto.lastName).toBeUndefined();
         expect(minimalDto.avatar).toBeUndefined();
         expect(minimalDto.preferences).toBeUndefined();
      });

      it('should handle empty string for optional fields', () => {
         const createDto: CreateUserProfileDto = {
            userId: 'user-id',
            username: 'username',
            firstName: '',
            lastName: '',
            avatar: '',
            preferences: {},
         };

         expect(createDto.firstName).toBe('');
         expect(createDto.lastName).toBe('');
         expect(createDto.avatar).toBe('');
      });
   });

   describe('UpdateUserProfileDto', () => {
      it('should accept all optional fields', () => {
         const updateDto: UpdateUserProfileDto = {
            username: 'updateduser',
            firstName: 'Updated',
            lastName: 'Name',
            avatar: 'new-avatar.jpg',
            preferences: { theme: 'auto' },
         };

         expect(updateDto.username).toBe('updateduser');
         expect(updateDto.firstName).toBe('Updated');
         expect(updateDto.lastName).toBe('Name');
         expect(updateDto.avatar).toBe('new-avatar.jpg');
         expect(updateDto.preferences?.theme).toBe('auto');
      });

      it('should accept partial updates', () => {
         const partialUpdate: UpdateUserProfileDto = {
            username: 'only-username-updated',
         };

         expect(partialUpdate.username).toBe('only-username-updated');
         expect(partialUpdate.firstName).toBeUndefined();
         expect(partialUpdate.lastName).toBeUndefined();
      });

      it('should handle empty string to clear fields', () => {
         const updateDto: UpdateUserProfileDto = {
            firstName: '',
            lastName: '',
            avatar: '',
         };

         expect(updateDto.firstName).toBe('');
         expect(updateDto.lastName).toBe('');
         expect(updateDto.avatar).toBe('');
      });
   });

   describe('UserSession', () => {
      it('should create valid UserSession', () => {
         const session = createMockUserSession();

         expect(session.userId).toBe('user-id');
         expect(session.username).toBe('testuser');
         expect(session.sessionId).toBe('session-id');
         expect(session.createdAt).toBeInstanceOf(Date);
         expect(session.lastAccessed).toBeInstanceOf(Date);
      });

      it('should handle different session IDs', () => {
         const sessions = [
            createMockUserSession({ sessionId: 'session-1' }),
            createMockUserSession({ sessionId: 'session-2' }),
            createMockUserSession({ sessionId: 'session-3' }),
         ];

         sessions.forEach((session, index) => {
            expect(session.sessionId).toBe(`session-${index + 1}`);
         });
      });

      it('should handle lastAccessed after createdAt', () => {
         const createdAt = new Date('2024-01-01');
         const lastAccessed = new Date('2024-01-02');
         const session = createMockUserSession({ createdAt, lastAccessed });

         expect(session.lastAccessed.getTime()).toBeGreaterThan(
            session.createdAt.getTime(),
         );
      });

      it('should handle same createdAt and lastAccessed', () => {
         const date = new Date();
         const session = createMockUserSession({
            createdAt: date,
            lastAccessed: date,
         });

         expect(session.createdAt).toEqual(session.lastAccessed);
      });
   });

   describe('AuthenticatedRequest', () => {
      it('should have optional user property', () => {
         const request: AuthenticatedRequest = {
            user: createMockUserProfileDto(),
         };

         expect(request.user).toBeDefined();
         expect(request.user?.username).toBe('testuser');
         expect(request.session).toBeUndefined();
      });

      it('should have optional session property', () => {
         const request: AuthenticatedRequest = {
            session: createMockUserSession(),
         };

         expect(request.session).toBeDefined();
         expect(request.session?.username).toBe('testuser');
         expect(request.user).toBeUndefined();
      });

      it('should have both user and session', () => {
         const request: AuthenticatedRequest = {
            user: createMockUserProfileDto(),
            session: createMockUserSession(),
         };

         expect(request.user).toBeDefined();
         expect(request.session).toBeDefined();
      });

      it('should handle empty AuthenticatedRequest', () => {
         const request: AuthenticatedRequest = {};

         expect(request.user).toBeUndefined();
         expect(request.session).toBeUndefined();
      });
   });

   describe('Edge cases', () => {
      it('should handle very long usernames', () => {
         const longUsername = 'A'.repeat(1000);
         const prismaProfile = createMockPrismaUserProfile({
            username: longUsername,
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.username.length).toBe(1000);
      });

      it('should handle unicode characters in names', () => {
         const prismaProfile = createMockPrismaUserProfile({
            firstName: 'Jōn',
            lastName: 'Müller',
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.firstName).toBe('Jōn');
         expect(result.lastName).toBe('Müller');
      });

      it('should handle special characters in preferences', () => {
         const specialPreferences = {
            'key-with-dash': 'value',
            "key'with'quotes": 'value',
            'key.with.dots': 'value',
            'key/with/slashes': 'value',
         };

         const prismaProfile = createMockPrismaUserProfile({
            preferences: specialPreferences as any,
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.preferences).toHaveProperty('key-with-dash');
         expect(result.preferences).toHaveProperty("key'with'quotes");
      });

      it('should handle deeply nested preferences', () => {
         const deeplyNested = {
            level1: {
               level2: {
                  level3: {
                     level4: {
                        value: 'deep',
                     },
                  },
               },
            },
         };

         const prismaProfile = createMockPrismaUserProfile({
            preferences: deeplyNested as any,
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.preferences).toEqual(deeplyNested);
      });

      it('should handle array in preferences', () => {
         const arrayPreferences = {
            favoriteGenres: ['Fantasy', 'Sci-Fi', 'Mystery'],
            recentAudiobooks: [
               { id: '1', title: 'Book 1' },
               { id: '2', title: 'Book 2' },
            ],
         };

         const prismaProfile = createMockPrismaUserProfile({
            preferences: arrayPreferences as any,
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.preferences).toHaveProperty('favoriteGenres');
         expect(Array.isArray((result.preferences as any)?.favoriteGenres)).toBe(
            true,
         );
      });

      it('should handle null and undefined consistently', () => {
         const prismaProfile = createMockPrismaUserProfile({
            firstName: null,
            lastName: null,
            avatar: null,
            preferences: null,
         });

         const result = toUserProfileDto(prismaProfile);

         expect(result.firstName).toBeUndefined();
         expect(result.lastName).toBeUndefined();
         expect(result.avatar).toBeUndefined();
         expect(result.preferences).toBeUndefined();
      });
   });
});

