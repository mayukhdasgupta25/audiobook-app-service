/**
 * UserProfile Service
 * Handles user profile creation and management operations
 */
import { PrismaClient } from '@prisma/client';
import { UsernameGenerator } from '../utils/UsernameGenerator';
import { UserProfileCreationResult } from '../types/user-events';

export class UserProfileService {
   private prisma: PrismaClient;
   private usernameGenerator: UsernameGenerator;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
      this.usernameGenerator = new UsernameGenerator(prisma);
   }

   /**
    * Create a new user profile
    */
   async createUserProfile(userId: string): Promise<UserProfileCreationResult> {
      try {
         // Check if user profile already exists
         const existingProfile = await this.prisma.userProfile.findUnique({
            where: { userId },
            select: { id: true, username: true }
         });

         if (existingProfile) {
            console.log(`User profile already exists for userId: ${userId}`);
            return {
               success: true,
               userProfile: {
                  id: existingProfile.id,
                  userId,
                  username: existingProfile.username
               }
            };
         }

         // Generate unique username
         const usernameResult = await this.usernameGenerator.generateUniqueUsername();

         // Create user profile
         const userProfile = await this.prisma.userProfile.create({
            data: {
               userId,
               username: usernameResult.username,
               // firstName and lastName are intentionally omitted as per requirements
               preferences: {
                  theme: 'light',
                  language: 'en',
                  autoPlay: false,
                  playbackSpeed: 1.0
               }
            },
            select: {
               id: true,
               userId: true,
               username: true,
               createdAt: true
            }
         });

         return {
            success: true,
            userProfile: {
               id: userProfile.id,
               userId: userProfile.userId,
               username: userProfile.username
            }
         };

      } catch (error: any) {
         console.error(`Failed to create user profile for userId: ${userId}`, error);

         return {
            success: false,
            error: error.message || 'Unknown error occurred'
         };
      }
   }

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
         console.error(`Failed to get user profile for userId: ${userId}`, error);
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
         console.error(`Failed to update user profile for userId: ${userId}`, error);
         throw error;
      }
   }

   /**
    * Delete user profile
    */
   async deleteUserProfile(userId: string): Promise<boolean> {
      try {
         await this.prisma.userProfile.delete({
            where: { userId }
         });

         console.log(`Deleted user profile for userId: ${userId}`);
         return true;
      } catch (error: any) {
         console.error(`Failed to delete user profile for userId: ${userId}`, error);
         throw error;
      }
   }
}
