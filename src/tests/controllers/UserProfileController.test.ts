/**
 * UserProfileController Tests
 * Tests for fetching and updating current user's profile
 */

import { PrismaClient } from '@prisma/client';
import { UserProfileController } from '../../controllers/UserProfileController';
import { UserProfileService } from '../../services/UserProfileService';
import { ResponseHandler } from '../../utils/ResponseHandler';
import { MessageHandler } from '../../utils/MessageHandler';

// Mock dependencies
jest.mock('../../services/UserProfileService');
jest.mock('../../utils/ResponseHandler');
jest.mock('../../utils/MessageHandler');

describe('UserProfileController', () => {
   let controller: UserProfileController;
   let mockPrisma: PrismaClient;
   let mockReq: any;
   let mockRes: any;
   let mockService: jest.Mocked<UserProfileService>;

   beforeEach(() => {
      mockPrisma = {} as PrismaClient;
      mockReq = {
         params: {},
         query: {},
         body: {},
         user: { id: 'user-123' },
         originalUrl: '/api/v1/user/profile',
      } as any;
      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis(),
         send: jest.fn().mockReturnThis(),
      } as any;

      mockReq.next = jest.fn();
      jest.clearAllMocks();

      controller = new UserProfileController(mockPrisma);
      mockService = (controller as any).userProfileService;
   });

   describe('getProfile', () => {
      it('should return current user profile', async () => {
         const profile = {
            id: 'profile-1',
            userId: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            avatar: 'avatar.jpg',
            preferences: { theme: 'dark' },
         } as any;

         mockService.getUserProfile.mockResolvedValue(profile);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Profile retrieved');

         await controller.getProfile(mockReq, mockRes, mockReq.next);

         expect(mockService.getUserProfile).toHaveBeenCalledWith('user-123');
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            profile,
            'Profile retrieved'
         );
      });
   });

   describe('updateProfile', () => {
      it('should update current user profile', async () => {
         mockReq.body = {
            username: 'newname',
            firstName: 'New',
            lastName: 'Name',
         };

         const updated = {
            id: 'profile-1',
            userId: 'user-123',
            username: 'newname',
            firstName: 'New',
            lastName: 'Name',
            updatedAt: new Date(),
         } as any;

         mockService.updateUserProfile.mockResolvedValue(updated);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Profile updated');

         await controller.updateProfile(mockReq, mockRes, mockReq.next);

         expect(mockService.updateUserProfile).toHaveBeenCalledWith('user-123', mockReq.body);
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            updated,
            'Profile updated'
         );
      });
   });
});


