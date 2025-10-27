/**
 * GenreDto Tests
 * Tests for Genre DTO conversion and validation
 */

import { GenreDto, toGenreDto } from '../../models/GenreDto';
import { Genre as PrismaGenre } from '@prisma/client';

describe('GenreDto', () => {
   // Mock factory for creating test data
   const createMockPrismaGenre = (overrides = {}): PrismaGenre => {
      return {
         id: 'genre-id',
         name: 'Fantasy',
         createdAt: new Date('2024-01-01'),
         updatedAt: new Date('2024-01-02'),
         ...overrides,
      };
   };

   const createMockGenreDto = (overrides = {}): GenreDto => {
      return {
         id: 'genre-id',
         name: 'Fantasy',
         createdAt: new Date('2024-01-01'),
         updatedAt: new Date('2024-01-02'),
         ...overrides,
      };
   };

   describe('toGenreDto', () => {
      it('should convert Prisma Genre to DTO', () => {
         const prismaGenre = createMockPrismaGenre();

         const result = toGenreDto(prismaGenre);

         expect(result.id).toBe(prismaGenre.id);
         expect(result.name).toBe(prismaGenre.name);
         expect(result.createdAt).toEqual(prismaGenre.createdAt);
         expect(result.updatedAt).toEqual(prismaGenre.updatedAt);
      });

      it('should convert genre with different name', () => {
         const prismaGenre = createMockPrismaGenre({
            name: 'Science Fiction',
         });

         const result = toGenreDto(prismaGenre);

         expect(result.name).toBe('Science Fiction');
      });

      it('should convert genre with different dates', () => {
         const prismaGenre = createMockPrismaGenre({
            createdAt: new Date('2023-12-01'),
            updatedAt: new Date('2023-12-15'),
         });

         const result = toGenreDto(prismaGenre);

         expect(result.createdAt).toEqual(new Date('2023-12-01'));
         expect(result.updatedAt).toEqual(new Date('2023-12-15'));
      });

      it('should handle different genre IDs', () => {
         const prismaGenre = createMockPrismaGenre({
            id: 'different-genre-id',
         });

         const result = toGenreDto(prismaGenre);

         expect(result.id).toBe('different-genre-id');
      });
   });

   describe('GenreDto structure', () => {
      it('should create valid GenreDto object', () => {
         const genre = createMockGenreDto();

         expect(genre.id).toBe('genre-id');
         expect(genre.name).toBe('Fantasy');
         expect(genre.createdAt).toBeInstanceOf(Date);
         expect(genre.updatedAt).toBeInstanceOf(Date);
      });

      it('should have all required fields', () => {
         const genre = createMockGenreDto();

         expect(genre).toHaveProperty('id');
         expect(genre).toHaveProperty('name');
         expect(genre).toHaveProperty('createdAt');
         expect(genre).toHaveProperty('updatedAt');
      });

      it('should handle different genre types', () => {
         const genres = [
            createMockGenreDto({ name: 'Mystery' }),
            createMockGenreDto({ name: 'Romance' }),
            createMockGenreDto({ name: 'Thriller' }),
            createMockGenreDto({ name: 'Biography' }),
         ];

         expect(genres.map((g) => g.name)).toEqual([
            'Mystery',
            'Romance',
            'Thriller',
            'Biography',
         ]);
      });
   });

   describe('Edge cases', () => {
      it('should handle very long genre names', () => {
         const longName = 'A'.repeat(1000);
         const genre = createMockGenreDto({ name: longName });

         expect(genre.name.length).toBe(1000);
      });

      it('should handle special characters in genre names', () => {
         const genre = createMockGenreDto({ name: "Horror/Suspense & Thriller's" });

         expect(genre.name).toBe("Horror/Suspense & Thriller's");
      });

      it('should handle unicode characters in genre names', () => {
         const genre = createMockGenreDto({ name: 'Mythologie Français' });

         expect(genre.name).toBe('Mythologie Français');
      });

      it('should handle same createdAt and updatedAt', () => {
         const date = new Date();
         const genre = createMockGenreDto({
            createdAt: date,
            updatedAt: date,
         });

         expect(genre.createdAt).toEqual(genre.updatedAt);
      });
   });
});

