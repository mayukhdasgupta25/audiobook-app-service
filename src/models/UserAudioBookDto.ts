/**
 * UserAudioBook DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { UserAudioBook as PrismaUserAudioBook, UserAudioBookType } from '@prisma/client';

export interface UserAudioBookDto {
   id: string;
   userProfileId: string;
   audiobookId: string;
   type: UserAudioBookType;
   progress?: number; // Total seconds listened (sum of chapter currentPosition values)
   createdAt: Date;
   updatedAt: Date;
}

export interface UserAudioBookWithRelations extends UserAudioBookDto {
   progress?: number; // Total seconds listened (sum of chapter currentPosition values)
   userProfile: {
      id: string;
      userId: string;
      username: string;
   };
   audiobook: {
      id: string;
      title: string;
      author: string;
      narrator?: string | null;
      coverImage?: string | null;
      imageAssets?: Record<string, string>;
   };
}

export interface CreateUserAudioBookDto {
   userProfileId: string;
   audiobookId: string;
}

export interface UserAudioBookQueryParams {
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: 'asc' | 'desc';
   userProfileId?: string;
   audiobookId?: string;
   type?: UserAudioBookType;
}

/**
 * Convert Prisma UserAudioBook model to UserAudioBookDto
 * Ensures consistent data structure for API responses
 */
export function toUserAudioBookDto(userAudioBook: PrismaUserAudioBook): UserAudioBookDto {
   return {
      id: userAudioBook.id,
      userProfileId: userAudioBook.userProfileId,
      audiobookId: userAudioBook.audiobookId,
      type: userAudioBook.type,
      progress: userAudioBook.progress ?? undefined,
      createdAt: userAudioBook.createdAt,
      updatedAt: userAudioBook.updatedAt
   };
}

/**
 * Convert Prisma UserAudioBook with relations to UserAudioBookWithRelations
 */
export function toUserAudioBookWithRelations(userAudioBook: any): UserAudioBookWithRelations {
   return {
      id: userAudioBook.id,
      userProfileId: userAudioBook.userProfileId,
      audiobookId: userAudioBook.audiobookId,
      type: userAudioBook.type,
      progress: userAudioBook.progress ?? undefined,
      createdAt: userAudioBook.createdAt,
      updatedAt: userAudioBook.updatedAt,
      userProfile: {
         id: userAudioBook.userProfile.id,
         userId: userAudioBook.userProfile.userId,
         username: userAudioBook.userProfile.username,
      },
      audiobook: {
         id: userAudioBook.audiobook.id,
         title: userAudioBook.audiobook.title,
         author: userAudioBook.audiobook.author,
         narrator: userAudioBook.audiobook.narrator,
         coverImage: userAudioBook.audiobook.coverImage
      }
   };
}

