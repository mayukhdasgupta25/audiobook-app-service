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
    * Create a new genre
    */
   async createGenre(name: string): Promise<GenreDto> {
      const trimmed = name.trim();
      try {
         // Check duplicate by case-insensitive name
         const existing = await this.prisma.genre.findFirst({
            where: { name: { equals: trimmed, mode: 'insensitive' } }
         });
         if (existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('genres.name_exists'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const created = await this.prisma.genre.create({
            data: { name: trimmed }
         });
         return toGenreDto(created);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('genres.create_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
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
      } catch (_error) {
         // console.error('Error fetching genres:', error);
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

         // console.error('Error fetching genre by ID:', error);
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
      } catch (_error) {
         // console.error('Error fetching genre by name:', error);
         throw new ApiError(
            MessageHandler.getErrorMessage('genres.fetch_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Update an existing genre's name
    */
   async updateGenre(id: string, name: string): Promise<GenreDto> {
      const trimmed = name.trim();
      try {
         // Ensure the genre exists
         const existingById = await this.prisma.genre.findUnique({ where: { id } });
         if (!existingById) {
            throw new ApiError(
               MessageHandler.getErrorMessage('genres.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         // Check for duplicate name (other record)
         const duplicate = await this.prisma.genre.findFirst({
            where: {
               name: { equals: trimmed, mode: 'insensitive' },
               NOT: { id }
            }
         });
         if (duplicate) {
            throw new ApiError(
               MessageHandler.getErrorMessage('genres.name_exists'),
               HttpStatusCode.BAD_REQUEST,
               ErrorType.VALIDATION_ERROR
            );
         }

         const updated = await this.prisma.genre.update({
            where: { id },
            data: { name: trimmed }
         });

         return toGenreDto(updated);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('genres.update_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }

   /**
    * Delete a genre by ID
    */
   async deleteGenre(id: string): Promise<boolean> {
      try {
         // Ensure exists first for consistent 404
         const existing = await this.prisma.genre.findUnique({ where: { id } });
         if (!existing) {
            throw new ApiError(
               MessageHandler.getErrorMessage('genres.not_found'),
               HttpStatusCode.NOT_FOUND,
               ErrorType.NOT_FOUND
            );
         }

         await this.prisma.genre.delete({ where: { id } });
         return true;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError(
            MessageHandler.getErrorMessage('genres.delete_failed'),
            HttpStatusCode.INTERNAL_SERVER_ERROR,
            ErrorType.INTERNAL_ERROR
         );
      }
   }
}
