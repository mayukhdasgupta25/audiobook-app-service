/**
 * Comment Service — audiobook comments with nested replies
 */
import { Prisma, PrismaClient } from '@prisma/client';
import {
   CommentDto,
   CommentQueryParams,
   CommentWithReplies,
   CreateCommentRequest,
   UpdateCommentRequest,
   commentUserInclude,
   toCommentDto,
   validateCommentMeta,
} from '../models/CommentDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

export class CommentService {
   constructor(private prisma: PrismaClient) {}

   async createComment(userProfileId: string, data: CreateCommentRequest): Promise<CommentDto> {
      const audiobook = await this.prisma.audioBook.findUnique({
         where: { id: data.audiobookId },
      });
      if (!audiobook) {
         throw new ApiError(
            MessageHandler.getErrorMessage('not_found.audiobook'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }

      if (data.parentId) {
         const parent = await this.prisma.comment.findUnique({
            where: { id: data.parentId },
         });
         if (!parent) {
            throw new ApiError(
               MessageHandler.getErrorMessage('comments.parent_not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }
         if (parent.audiobookId !== data.audiobookId) {
            throw new ApiError(
               MessageHandler.getErrorMessage('comments.parent_audiobook_mismatch'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }
      }

      let metaJson: Prisma.InputJsonValue | undefined;
      if (data.meta !== undefined) {
         try {
            metaJson = validateCommentMeta(data.meta) as unknown as Prisma.InputJsonValue;
         } catch {
            throw new ApiError(
               MessageHandler.getErrorMessage('validation.comment_meta_invalid'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }
      }

      const createData: Prisma.CommentUncheckedCreateInput = {
         userProfileId,
         audiobookId: data.audiobookId,
         parentId: data.parentId ?? null,
         content: data.content.trim(),
      };
      if (metaJson !== undefined) {
         createData.meta = metaJson;
      }

      const comment = await this.prisma.comment.create({
         data: createData,
         include: commentUserInclude,
      });

      return toCommentDto(comment);
   }

   async getComments(query: CommentQueryParams): Promise<{ comments: CommentDto[]; totalCount: number }> {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;
      const sortBy = query.sortBy ?? 'createdAt';
      const sortOrder = query.sortOrder ?? 'desc';

      const where: Prisma.CommentWhereInput = {};
      if (query.audiobookId) {
         where.audiobookId = query.audiobookId;
      }
      if (query.parentId === null || query.parentId === 'null') {
         where.parentId = null;
      } else if (query.parentId) {
         where.parentId = query.parentId;
      }

      const [comments, totalCount] = await Promise.all([
         this.prisma.comment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: commentUserInclude,
         }),
         this.prisma.comment.count({ where }),
      ]);

      return {
         comments: comments.map(toCommentDto),
         totalCount,
      };
   }

   async getCommentById(id: string): Promise<CommentWithReplies> {
      const comment = await this.prisma.comment.findUnique({
         where: { id },
         include: {
            ...commentUserInclude,
            replies: {
               orderBy: { createdAt: 'asc' },
               include: commentUserInclude,
            },
         },
      });

      if (!comment) {
         throw new ApiError(
            MessageHandler.getErrorMessage('comments.not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }

      return {
         ...toCommentDto(comment),
         replies: comment.replies.map(toCommentDto),
      };
   }

   async updateComment(
      id: string,
      userProfileId: string,
      data: UpdateCommentRequest
   ): Promise<CommentDto> {
      const existing = await this.prisma.comment.findUnique({ where: { id } });
      if (!existing) {
         throw new ApiError(
            MessageHandler.getErrorMessage('comments.not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }
      if (existing.userProfileId !== userProfileId) {
         throw ApiError.forbidden(MessageHandler.getErrorMessage('comments.access_denied'));
      }

      const updateData: Prisma.CommentUpdateInput = {};
      if (data.content !== undefined) {
         updateData.content = data.content.trim();
      }
      if (data.meta !== undefined) {
         updateData.meta =
            data.meta === null
               ? Prisma.JsonNull
               : (() => {
                    try {
                       return validateCommentMeta(data.meta) as unknown as Prisma.InputJsonValue;
                    } catch {
                       throw new ApiError(
                          MessageHandler.getErrorMessage('validation.comment_meta_invalid'),
                          HttpStatusCode.BAD_REQUEST,
                          ErrorType.VALIDATION_ERROR
                       );
                    }
                 })();
      }

      if (Object.keys(updateData).length === 0) {
         throw new ApiError(
            MessageHandler.getErrorMessage('validation.no_update_fields'),
            HttpStatusCode.BAD_REQUEST,
            ErrorType.VALIDATION_ERROR
         );
      }

      const updated = await this.prisma.comment.update({
         where: { id },
         data: updateData,
         include: commentUserInclude,
      });

      return toCommentDto(updated);
   }

   async deleteComment(id: string, userProfileId: string): Promise<void> {
      const existing = await this.prisma.comment.findUnique({ where: { id } });
      if (!existing) {
         throw new ApiError(
            MessageHandler.getErrorMessage('comments.not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }
      if (existing.userProfileId !== userProfileId) {
         throw ApiError.forbidden(MessageHandler.getErrorMessage('comments.access_denied'));
      }

      await this.prisma.comment.delete({ where: { id } });
   }
}
