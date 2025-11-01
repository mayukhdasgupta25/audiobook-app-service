/**
 * UserAudioBook Service Layer
 * Handles business logic and database operations for user-audiobook relationships
 */
import { PrismaClient, UserAudioBookType, Prisma } from '@prisma/client';
import {
   UserAudioBookDto,
   UserAudioBookWithRelations,
   CreateUserAudioBookDto,
   UpdateUserAudioBookDto,
   UserAudioBookQueryParams,
   toUserAudioBookDto,
   toUserAudioBookWithRelations
} from '../models/UserAudioBookDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

export class UserAudioBookService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Create a new user-audiobook relationship
    */
   async createUserAudioBook(data: CreateUserAudioBookDto): Promise<UserAudioBookDto> {
      try {
         // Validate that userProfile exists
         const userProfile = await this.prisma.userProfile.findUnique({
            where: { id: data.userProfileId }
         });
         if (!userProfile) {
            throw new ApiError(
               MessageHandler.getErrorMessage('not_found.user'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         // Validate that audiobook exists
         const audiobook = await this.prisma.audioBook.findUnique({
            where: { id: data.audiobookId }
         });
         if (!audiobook) {
            throw new ApiError(
               MessageHandler.getErrorMessage('not_found.audiobook'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         // Check for duplicate relationship
         const existing = await this.prisma.userAudioBook.findUnique({
            where: {
               userProfileId_audiobookId: {
                  userProfileId: data.userProfileId,
                  audiobookId: data.audiobookId
               }
            }
         });

         if (existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('conflict.user_audiobook_exists'),
               HttpStatusCode.CONFLICT,
               ErrorType.CONFLICT
            );
         }

         const created = await this.prisma.userAudioBook.create({
            data: {
               userProfileId: data.userProfileId,
               audiobookId: data.audiobookId,
               type: data.type || UserAudioBookType.OWNED
            }
         });

         return toUserAudioBookDto(created);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('internal.create_user_audiobook'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get all user-audiobook relationships with pagination and filtering
    */
   async getAllUserAudioBooks(queryParams: UserAudioBookQueryParams): Promise<{
      userAudioBooks: UserAudioBookDto[];
      totalCount: number;
   }> {
      try {
         const page = queryParams.page || 1;
         const limit = queryParams.limit || 10;
         const skip = (page - 1) * limit;
         const sortBy = queryParams.sortBy || 'createdAt';
         const sortOrder = queryParams.sortOrder || 'desc';

         // Build where clause
         const where: Prisma.UserAudioBookWhereInput = {};

         if (queryParams.userProfileId) {
            where.userProfileId = queryParams.userProfileId;
         }

         if (queryParams.audiobookId) {
            where.audiobookId = queryParams.audiobookId;
         }

         if (queryParams.type) {
            where.type = queryParams.type;
         }

         // Get total count
         const totalCount = await this.prisma.userAudioBook.count({ where });

         // Get paginated results
         const userAudioBooks = await this.prisma.userAudioBook.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
               [sortBy]: sortOrder
            }
         });

         return {
            userAudioBooks: userAudioBooks.map(toUserAudioBookDto),
            totalCount
         };
      } catch (_error) {
         throw new ApiError(
            MessageHandler.getErrorMessage('internal.fetch_user_audiobooks'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get user-audiobook relationship by ID
    */
   async getUserAudioBookById(id: string): Promise<UserAudioBookWithRelations> {
      try {
         const userAudioBook = await this.prisma.userAudioBook.findUnique({
            where: { id },
            include: {
               userProfile: {
                  select: {
                     id: true,
                     userId: true,
                     username: true,
                     firstName: true,
                     lastName: true
                  }
               },
               audiobook: {
                  select: {
                     id: true,
                     title: true,
                     author: true,
                     narrator: true,
                     coverImage: true
                  }
               }
            }
         });

         if (!userAudioBook) {
            throw new ApiError(
               MessageHandler.getErrorMessage('not_found.user_audiobook'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         return toUserAudioBookWithRelations(userAudioBook);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('internal.fetch_user_audiobooks'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Update user-audiobook relationship (type only)
    */
   async updateUserAudioBook(id: string, updateData: UpdateUserAudioBookDto): Promise<UserAudioBookDto> {
      try {
         // Ensure the relationship exists
         const existing = await this.prisma.userAudioBook.findUnique({ where: { id } });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('not_found.user_audiobook'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         // Build update data object, only including defined fields
         const updateFields: { type?: UserAudioBookType } = {};
         if (updateData.type !== undefined) {
            updateFields.type = updateData.type;
         }

         const updated = await this.prisma.userAudioBook.update({
            where: { id },
            data: updateFields
         });

         return toUserAudioBookDto(updated);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('internal.update_user_audiobook'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Delete user-audiobook relationship
    */
   async deleteUserAudioBook(id: string): Promise<boolean> {
      try {
         // Ensure exists first for consistent 404
         const existing = await this.prisma.userAudioBook.findUnique({ where: { id } });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('not_found.user_audiobook'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         await this.prisma.userAudioBook.delete({ where: { id } });
         return true;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('internal.delete_user_audiobook'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get all audiobooks for a specific user
    */
   async getUserAudioBooksByUserProfileId(
      userProfileId: string,
      queryParams?: UserAudioBookQueryParams
   ): Promise<{ userAudioBooks: UserAudioBookDto[]; totalCount: number }> {
      return this.getAllUserAudioBooks({
         ...queryParams,
         userProfileId
      });
   }

   /**
    * Get all users for a specific audiobook
    */
   async getUserAudioBooksByAudiobookId(
      audiobookId: string,
      queryParams?: UserAudioBookQueryParams
   ): Promise<{ userAudioBooks: UserAudioBookDto[]; totalCount: number }> {
      return this.getAllUserAudioBooks({
         ...queryParams,
         audiobookId
      });
   }

   /**
    * Get all user-audiobook relationships by type
    */
   async getUserAudioBooksByType(
      type: UserAudioBookType,
      queryParams?: UserAudioBookQueryParams
   ): Promise<{ userAudioBooks: UserAudioBookDto[]; totalCount: number }> {
      return this.getAllUserAudioBooks({
         ...queryParams,
         type
      });
   }
}

