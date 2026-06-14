/**
 * User DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { UserProfile as PrismaUserProfile } from '@prisma/client';

// UserProfile DTO for app-local profile information (username, avatar, preferences)
export interface UserProfileDto {
   id: string;
   userId: string;
   username: string;
   avatar?: string | undefined;
   imageAssets?: Record<string, string>;
   preferences?: any | undefined;
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateUserProfileDto {
   userId: string;
   username: string;
   avatar?: string;
   preferences?: any;
}

export interface UpdateUserProfileDto {
   username?: string;
   avatar?: string;
   preferences?: any;
}

/**
 * Convert Prisma UserProfile to DTO
 */
export function toUserProfileDto(profile: PrismaUserProfile): UserProfileDto {
   return {
      id: profile.id,
      userId: profile.userId,
      username: profile.username,
      avatar: profile.avatar || undefined,
      preferences: profile.preferences || undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
   };
}

/**
 * User session interface
 */
export interface UserSession {
   userId: string;
   username: string;
   sessionId: string;
   createdAt: Date;
   lastAccessed: Date;
}

/**
 * Request interface with user context
 */
export interface AuthenticatedRequest {
   user?: UserProfileDto;
   session?: UserSession;
}
