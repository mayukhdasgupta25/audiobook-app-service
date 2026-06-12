/**
 * Comment DTO classes for API communication
 */
import { Comment as PrismaComment, Prisma } from '@prisma/client';

export interface CommentMeta {
   position: number;
}

export interface CommentUserDto {
   username?: string | null;
   avatar?: string | null;
}

export interface CommentDto {
   id: string;
   userProfileId: string;
   audiobookId: string;
   parentId?: string | null;
   content: string;
   meta?: CommentMeta | null;
   user?: CommentUserDto;
   createdAt: Date;
   updatedAt: Date;
}

export interface CommentWithReplies extends CommentDto {
   replies?: CommentDto[];
}

export interface CreateCommentRequest {
   audiobookId: string;
   content: string;
   parentId?: string;
   meta?: CommentMeta;
}

export interface UpdateCommentRequest {
   content?: string;
   meta?: CommentMeta | null;
}

export interface CommentQueryParams {
   audiobookId?: string;
   parentId?: string | null;
   page?: number;
   limit?: number;
   sortBy?: 'createdAt' | 'updatedAt';
   sortOrder?: 'asc' | 'desc';
}

type CommentUserProfileSelect = {
   username: string;
   avatar: string | null;
};

type CommentWithUserProfile = PrismaComment & {
   userProfile?: CommentUserProfileSelect;
};

export const commentUserProfileSelect = {
   username: true,
   avatar: true,
} as const;

export const commentUserInclude = {
   userProfile: {
      select: commentUserProfileSelect,
   },
} as const;

export function parseCommentMeta(value: Prisma.JsonValue | null): CommentMeta | null {
   if (value === null || value === undefined) {
      return null;
   }
   if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if (typeof obj['position'] === 'number') {
         return { position: obj['position'] };
      }
   }
   return null;
}

export function toCommentUserDto(profile: CommentUserProfileSelect): CommentUserDto {
   return {
      username: profile.username,
      avatar: profile.avatar,
   };
}

export function toCommentDto(comment: CommentWithUserProfile): CommentDto {
   const dto: CommentDto = {
      id: comment.id,
      userProfileId: comment.userProfileId,
      audiobookId: comment.audiobookId,
      parentId: comment.parentId,
      content: comment.content,
      meta: parseCommentMeta(comment.meta),
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
   };

   if (comment.userProfile) {
      dto.user = toCommentUserDto(comment.userProfile);
   }

   return dto;
}

export function validateCommentMeta(meta: unknown): CommentMeta {
   if (meta === null || meta === undefined) {
      throw new Error('Meta must be an object with position');
   }
   if (typeof meta !== 'object' || Array.isArray(meta)) {
      throw new Error('Meta must be an object with position');
   }
   const obj = meta as Record<string, unknown>;
   const keys = Object.keys(obj);
   if (keys.length !== 1 || !keys.includes('position')) {
      throw new Error('Meta may only contain position');
   }
   if ('chapterId' in obj) {
      throw new Error('Meta must not contain chapterId');
   }
   if (typeof obj['position'] !== 'number' || !Number.isFinite(obj['position']) || obj['position'] < 0) {
      throw new Error('Meta position must be a non-negative number');
   }
   return { position: obj['position'] };
}
