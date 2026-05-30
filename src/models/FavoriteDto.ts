/**
 * Favorite DTO classes for API communication
 */
import { Favorite as PrismaFavorite } from '@prisma/client';

export interface FavoriteDto {
   id: string;
   userProfileId: string;
   audiobookId: string;
   createdAt: Date;
}

export interface CreateFavoriteRequest {
   audiobookId: string;
}

export interface FavoriteQueryParams {
   audiobookId?: string;
   page?: number;
   limit?: number;
   sortBy?: 'createdAt';
   sortOrder?: 'asc' | 'desc';
}

export function toFavoriteDto(favorite: PrismaFavorite): FavoriteDto {
   return {
      id: favorite.id,
      userProfileId: favorite.userProfileId,
      audiobookId: favorite.audiobookId,
      createdAt: favorite.createdAt,
   };
}
