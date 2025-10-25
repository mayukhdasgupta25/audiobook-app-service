/**
 * Genre Service Layer
 * Handles business logic and database operations for genre management following OOP principles
 */
import { PrismaClient } from '@prisma/client';
import { GenreDto, toGenreDto } from '../models/GenreDto';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { HttpStatusCode, ErrorType } from '../types/common';

export class GenreService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Get all available genres
    * Returns all genres sorted by name in ascending order
    */
   async getAllGenres(): Promise<GenreDto[]> {
      try {
         const genres = await this.prisma.genre.findMany({
            orderBy: {
               name: 'asc'
            }
         });

         return genres.map(genre => toGenreDto(genre));
      } catch (error) {
         console.error('Error fetching genres:', error);
         throw new ApiError(
            MessageHandler.getErrorMessage('genres.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get genre by ID
    * Returns a specific genre by its unique identifier
    */
   async getGenreById(id: string): Promise<GenreDto> {
      try {
         const genre = await this.prisma.genre.findUnique({
            where: { id }
         });

         if (!genre) {
            throw new ApiError(
               MessageHandler.getErrorMessage('genres.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         return toGenreDto(genre);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }

         console.error('Error fetching genre by ID:', error);
         throw new ApiError(
            MessageHandler.getErrorMessage('genres.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Get genre by name
    * Returns a specific genre by its name (case-insensitive)
    */
   async getGenreByName(name: string): Promise<GenreDto | null> {
      try {
         const genre = await this.prisma.genre.findFirst({
            where: {
               name: {
                  equals: name,
                  mode: 'insensitive'
               }
            }
         });

         return genre ? toGenreDto(genre) : null;
      } catch (error) {
         console.error('Error fetching genre by name:', error);
         throw new ApiError(
            MessageHandler.getErrorMessage('genres.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }
}
