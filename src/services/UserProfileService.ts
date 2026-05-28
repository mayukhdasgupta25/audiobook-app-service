/**
 * UserProfile Service
 * Handles user profile creation and management operations
 */
import { Gender, PrismaClient } from '@prisma/client';
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
    * Create user profile
    */
   async createUserProfile(
      userId: string,
      options?: {
         firstName?: string;
         lastName?: string;
      }
   ): Promise<UserProfileCreationResult> {
      try {
         // Check if user profile already exists
         const existingProfile = await this.prisma.userProfile.findUnique({
            where: { userId },
            select: { id: true, username: true }
         });

         if (existingProfile) {
            return {
               success: false,
               error: 'User profile already exists'
            };
         }

         // Generate unique username
         const usernameResult = await this.usernameGenerator.generateUniqueUsername();

         // Prepare profile data with optional firstName and lastName
         const profileData: {
            userId: string;
            username: string;
            firstName?: string;
            lastName?: string;
            preferences: {
               theme: string;
               language: string;
               autoPlay: boolean;
               playbackSpeed: number;
            };
         } = {
            userId,
            username: usernameResult.username,
            preferences: {
               theme: 'light',
               language: 'en',
               autoPlay: false,
               playbackSpeed: 1.0
            }
         };

         // Add firstName and lastName if provided
         if (options?.firstName) {
            profileData.firstName = options.firstName;
         }
         if (options?.lastName) {
            profileData.lastName = options.lastName;
         }

         // Create user profile
         const userProfile = await this.prisma.userProfile.create({
            data: profileData,
            select: {
               id: true,
               userId: true,
               username: true
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
         // console.error(`Failed to create user profile for userId: ${userId}`, error);
         return {
            success: false,
            error: error.message || 'Failed to create user profile'
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
               gender: true,
               location: true,
               age: true,
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
      gender?: Gender | null;
      location?: string | null;
      age?: number | null;
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
               gender: true,
               location: true,
               age: true,
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

   /**
    * Delete user profile
    */
   async deleteUserProfile(userId: string): Promise<void> {
      try {
         await this.prisma.userProfile.delete({
            where: { userId }
         });
      } catch (error: any) {
         // console.error(`Failed to delete user profile for userId: ${userId}`, error);
         throw error;
      }
   }
}
