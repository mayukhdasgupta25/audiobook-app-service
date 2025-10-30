/**
 * UserProfileService Tests
 * Tests for user profile management functionality
 */

import { UserProfileService } from '../../services/UserProfileService';

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

      userProfileService = new UserProfileService(mockPrisma);
   });

   // Removed createUserProfile tests as creation is no longer supported

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

   // Removed deleteUserProfile tests as deletion is no longer supported

   describe('Edge cases', () => {
      // Creation-related edge cases removed

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

