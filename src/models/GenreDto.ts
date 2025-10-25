/**
 * Genre DTO (Data Transfer Object) classes
 * Provides type-safe data structures for API communication
 */
import { Genre as PrismaGenre } from '@prisma/client';

export interface GenreDto {
   id: string;
   name: string;
   createdAt: Date;
   updatedAt: Date;
}

/**
 * Convert Prisma Genre model to GenreDto
 * Ensures consistent data structure for API responses
 */
export function toGenreDto(genre: PrismaGenre): GenreDto {
   return {
      id: genre.id,
      name: genre.name,
      createdAt: genre.createdAt,
      updatedAt: genre.updatedAt
   };
}
