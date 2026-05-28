/**
 * User DTO (Data Transfer Object) classes
 * Provides type-safe data structures for user authentication and profile management
 */
import { Gender, UserProfile as PrismaUserProfile } from '@prisma/client';

export { Gender };


// UserProfile DTO for profile information
export interface UserProfileDto {
   id: string;
   userId: string;
   username: string;
   firstName?: string | undefined;
   lastName?: string | undefined;
   avatar?: string | undefined;
   gender?: Gender | undefined;
   location?: string | undefined;
   age?: number | undefined;
   preferences?: any | undefined;
   createdAt: Date;
   updatedAt: Date;
}



export interface CreateUserProfileDto {
   userId: string;
   username: string;
   firstName?: string;
   lastName?: string;
   avatar?: string;
   gender?: Gender;
   location?: string;
   age?: number;
   preferences?: any;
}



export interface UpdateUserProfileDto {
   username?: string;
   firstName?: string;
   lastName?: string;
   avatar?: string;
   gender?: Gender | null;
   location?: string | null;
   /** When provided with longitude, reverse-geocoded into `location` on update. */
   latitude?: number;
   /** When provided with latitude, reverse-geocoded into `location` on update. */
   longitude?: number;
   age?: number | null;
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
      firstName: profile.firstName || undefined,
      lastName: profile.lastName || undefined,
      avatar: profile.avatar || undefined,
      gender: profile.gender ?? undefined,
      location: profile.location ?? undefined,
      age: profile.age ?? undefined,
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
