/**
 * UserProfile Service
 * Handles user profile creation and management operations
 */
import { PrismaClient } from '@prisma/client';

export class UserProfileService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   // Removed createUserProfile per requirements

   /**
    * Get user profile by userId
    */
   async getUserProfile(userId: string): Promise<any> {
      try {
         const userProfile = await this.prisma.userProfile.findUnique({
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
               updatedAt: true
            }
         });

         return userProfile;
      } catch (error: any) {
         // console.error(`Failed to get user profile for userId: ${userId}`, error);
         throw error;
      }
   }

   /**
    * Update user profile
    */
   async updateUserProfile(userId: string, updateData: {
      username?: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
      preferences?: any;
   }): Promise<any> {
      try {
         const userProfile = await this.prisma.userProfile.update({
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
               updatedAt: true
            }
         });

         return userProfile;
      } catch (error: any) {
         // console.error(`Failed to update user profile for userId: ${userId}`, error);
         throw error;
      }
   }

   // Removed deleteUserProfile per requirements
}
