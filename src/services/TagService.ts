/**
 * Tag Service Layer
 * Handles business logic and database operations for tag management following OOP principles
 */
import { PrismaClient } from '@prisma/client';
import { TagDto, toTagDto } from '../models/TagDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

export class TagService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Get all available tags
    * Returns all tags sorted by name in ascending order
    */
   async getAllTags(): Promise<TagDto[]> {
      try {
         const tags = await this.prisma.tag.findMany({
            orderBy: {
               name: 'asc'
            }
         });

         return tags.map(tag => toTagDto(tag));
      } catch (_error) {
         // console.error('Error fetching tags:', error);
         throw new ApiError(
            MessageHandler.getErrorMessage('tags.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get tag by ID
    * Returns a specific tag by its unique identifier
    */
   async getTagById(id: string): Promise<TagDto> {
      try {
         const tag = await this.prisma.tag.findUnique({
            where: { id }
         });

         if (!tag) {
            throw new ApiError(
               MessageHandler.getErrorMessage('tags.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         return toTagDto(tag);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }

         // console.error('Error fetching tag by ID:', error);
         throw new ApiError(
            MessageHandler.getErrorMessage('tags.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }
}

