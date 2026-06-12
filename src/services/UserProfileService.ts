/**
 * UserProfile Service
 * Handles app-local user profile creation and management (username, avatar, preferences)
 */
import { PrismaClient } from '@prisma/client';
import { UsernameGenerator } from '../utils/UsernameGenerator';
import { UserProfileCreationResult } from '../types/user-events';
import { fileUrlService } from './FileUrlService';

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
         avatar?: string;
      }
   ): Promise<UserProfileCreationResult> {
      try {
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

         const usernameResult = await this.usernameGenerator.generateUniqueUsername();

         const profileData: {
            userId: string;
            username: string;
            avatar?: string;
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

         if (options?.avatar) {
            profileData.avatar = options.avatar;
         }

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
               avatar: true,
               preferences: true,
               createdAt: true,
               updatedAt: true
            }
         });

         if (!userProfile) {
            return userProfile;
         }

         const avatar = await fileUrlService.resolveForClient(userProfile.avatar);
         return {
            ...userProfile,
            ...(avatar !== undefined ? { avatar } : {}),
         };
      } catch (error: any) {
         throw error;
      }
   }

   /**
    * Update user profile
    */
   async updateUserProfile(userId: string, updateData: {
      username?: string;
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
               avatar: true,
               preferences: true,
               updatedAt: true
            }
         });

         const avatar = await fileUrlService.resolveForClient(userProfile.avatar);
         return {
            ...userProfile,
            ...(avatar !== undefined ? { avatar } : {}),
         };
      } catch (error: any) {
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
         throw error;
      }
   }
}
