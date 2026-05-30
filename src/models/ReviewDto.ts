/**
 * Review DTO classes for API communication
 */
import { Review as PrismaReview } from '@prisma/client';

export interface ReviewDto {
   id: string;
   userProfileId: string;
   audiobookId: string;
   rating: number;
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateReviewRequest {
   audiobookId: string;
   rating: number;
}

export interface UpdateReviewRequest {
   rating: number;
}

export interface ReviewQueryParams {
   audiobookId?: string;
   userProfileId?: string;
   page?: number;
   limit?: number;
   sortBy?: 'createdAt' | 'updatedAt' | 'rating';
   sortOrder?: 'asc' | 'desc';
}

export function toReviewDto(review: PrismaReview): ReviewDto {
   return {
      id: review.id,
      userProfileId: review.userProfileId,
      audiobookId: review.audiobookId,
      rating: review.rating,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
   };
}
