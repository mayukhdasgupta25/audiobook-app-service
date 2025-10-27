/**
 * UserProfileService Tests
 * Tests for user profile management functionality
 */

import { UserProfileService } from '../../services/UserProfileService';
import { UsernameGenerator } from '../../utils/UsernameGenerator';

// Mock UsernameGenerator
jest.mock('../../utils/UsernameGenerator');
const MockedUsernameGenerator = UsernameGenerator as jest.MockedClass<typeof UsernameGenerator>;

// Mock Prisma client
const mockPrisma = {
   userProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
   },
} as any;

describe('UserProfileService', () => {
   let userProfileService: UserProfileService;

   beforeEach(() => {
      jest.clearAllMocks();

      // Mock UsernameGenerator methods
      MockedUsernameGenerator.mockImplementation(() => ({
         generateUniqueUsername: jest.fn().mockResolvedValue({ username: 'user123' }),
      } as any));

      userProfileService = new UserProfileService(mockPrisma);
   });

   describe('createUserProfile', () => {
      it('should create a new user profile with generated username', async () => {
         const userId = 'user-123';
         const generatedUsername = 'user123';

         mockPrisma.userProfile.findUnique.mockResolvedValue(null);

         jest.spyOn(UsernameGenerator.prototype, 'generateUniqueUsername').mockResolvedValue({ username: generatedUsername, attempts: 1 });

         mockPrisma.userProfile.create.mockResolvedValue({
            id: 'profile-1',
            userId,
            username: generatedUsername,
            createdAt: new Date(),
         });

         const result = await userProfileService.createUserProfile(userId);

         expect(result.success).toBe(true);
         if (result.success && result.userProfile) {
            expect(result.userProfile.userId).toBe(userId);
            expect(result.userProfile.username).toBe(generatedUsername);
         }
         expect(mockPrisma.userProfile.create).toHaveBeenCalledWith({
            data: {
               userId,
               username: generatedUsername,
               preferences: {
                  theme: 'light',
                  language: 'en',
                  autoPlay: false,
                  playbackSpeed: 1.0,
               },
            },
            select: {
               id: true,
               userId: true,
               username: true,
               createdAt: true,
            },
         });
      });

      it('should return existing profile if already exists', async () => {
         const userId = 'user-123';
         const existingProfile = {
            id: 'profile-1',
            userId,
            username: 'existing-user',
         };

         mockPrisma.userProfile.findUnique.mockResolvedValue(existingProfile);

         const result = await userProfileService.createUserProfile(userId);

         expect(result.success).toBe(true);
         if (result.success && result.userProfile) {
            expect(result.userProfile.id).toBe('profile-1');
            expect(result.userProfile.username).toBe('existing-user');
         }
         expect(mockPrisma.userProfile.create).not.toHaveBeenCalled();
      });

      it('should handle errors during profile creation', async () => {
         const userId = 'user-123';
         const error = new Error('Database error');

         mockPrisma.userProfile.findUnique.mockResolvedValue(null);

         // Mock the usernameGenerator instance method
         const mockGenerateUniqueUsername = jest.spyOn(
            userProfileService['usernameGenerator'],
            'generateUniqueUsername'
         ).mockRejectedValue(error);

         const result = await userProfileService.createUserProfile(userId);

         expect(result.success).toBe(false);
         expect(result.error).toBeDefined();

         mockGenerateUniqueUsername.mockRestore();
      });
   });

   describe('getUserProfile', () => {
      it('should return user profile by userId', async () => {
         const userId = 'user-123';
         const mockProfile = {
            id: 'profile-1',
            userId,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            avatar: 'avatar.jpg',
            preferences: { theme: 'dark' },
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);

         const result = await userProfileService.getUserProfile(userId);

         expect(result).toEqual(mockProfile);
         expect(mockPrisma.userProfile.findUnique).toHaveBeenCalledWith({
            where: { userId },
            select: {
               id: true,
               userId: true,
               username: true,
               firstName: true,
               lastName: true,
               avatar: true,
               preferences: true,
               createdAt: true,
               updatedAt: true,
            },
         });
      });

      it('should return null when profile not found', async () => {
         const userId = 'non-existent';

         mockPrisma.userProfile.findUnique.mockResolvedValue(null);

         const result = await userProfileService.getUserProfile(userId);

         expect(result).toBeNull();
      });

      it('should handle database errors', async () => {
         const userId = 'user-123';
         const error = new Error('Database connection failed');

         mockPrisma.userProfile.findUnique.mockRejectedValue(error);

         await expect(userProfileService.getUserProfile(userId)).rejects.toThrow('Database connection failed');
      });
   });

   describe('updateUserProfile', () => {
      it('should update user profile successfully', async () => {
         const userId = 'user-123';
         const updateData = {
            username: 'updated-username',
            firstName: 'Updated',
            lastName: 'Name',
            preferences: { theme: 'dark', language: 'fr' },
         };

         const updatedProfile = {
            id: 'profile-1',
            userId,
            ...updateData,
            updatedAt: new Date(),
         };

         mockPrisma.userProfile.update.mockResolvedValue(updatedProfile);

         const result = await userProfileService.updateUserProfile(userId, updateData);

         expect(result).toEqual(updatedProfile);
         expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
            where: { userId },
            data: updateData,
            select: {
               id: true,
               userId: true,
               username: true,
               firstName: true,
               lastName: true,
               avatar: true,
               preferences: true,
               updatedAt: true,
            },
         });
      });

      it('should handle partial updates', async () => {
         const userId = 'user-123';
         const updateData = {
            avatar: 'new-avatar.jpg',
         };

         const updatedProfile = {
            id: 'profile-1',
            userId,
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            ...updateData,
            updatedAt: new Date(),
         };

         mockPrisma.userProfile.update.mockResolvedValue(updatedProfile);

         const result = await userProfileService.updateUserProfile(userId, updateData);

         expect(result.avatar).toBe('new-avatar.jpg');
      });

      it('should handle database errors during update', async () => {
         const userId = 'user-123';
         const updateData = { username: 'new-username' };
         const error = new Error('Update failed');

         mockPrisma.userProfile.update.mockRejectedValue(error);

         await expect(userProfileService.updateUserProfile(userId, updateData)).rejects.toThrow('Update failed');
      });
   });

   describe('deleteUserProfile', () => {
      it('should delete user profile successfully', async () => {
         const userId = 'user-123';

         mockPrisma.userProfile.delete.mockResolvedValue({});

         const result = await userProfileService.deleteUserProfile(userId);

         expect(result).toBe(true);
         expect(mockPrisma.userProfile.delete).toHaveBeenCalledWith({
            where: { userId },
         });
      });

      it('should handle errors during deletion', async () => {
         const userId = 'user-123';
         const error = new Error('Deletion failed');

         mockPrisma.userProfile.delete.mockRejectedValue(error);

         await expect(userProfileService.deleteUserProfile(userId)).rejects.toThrow('Deletion failed');
      });
   });

   describe('Edge cases', () => {
      it('should handle special characters in username', async () => {
         const userId = 'user-123';
         const specialUsername = 'user_@#123';

         mockPrisma.userProfile.findUnique.mockResolvedValue(null);
         jest.spyOn(UsernameGenerator.prototype, 'generateUniqueUsername').mockResolvedValue({ username: specialUsername, attempts: 1 });

         mockPrisma.userProfile.create.mockResolvedValue({
            id: 'profile-1',
            userId,
            username: specialUsername,
            createdAt: new Date(),
         });

         const result = await userProfileService.createUserProfile(userId);

         expect(result.success).toBe(true);
         if (result.success && result.userProfile) {
            expect(result.userProfile.username).toBe(specialUsername);
         }
      });

      it('should handle complex preferences object', async () => {
         const userId = 'user-123';
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

         mockPrisma.userProfile.findUnique.mockResolvedValue(null);
         jest.spyOn(UsernameGenerator.prototype, 'generateUniqueUsername').mockResolvedValue({ username: 'user123', attempts: 1 });

         mockPrisma.userProfile.update.mockResolvedValue({
            id: 'profile-1',
            userId,
            preferences: complexPreferences,
            updatedAt: new Date(),
         });

         const result = await userProfileService.updateUserProfile(userId, { preferences: complexPreferences });

         expect(result.preferences).toEqual(complexPreferences);
      });
   });
});

