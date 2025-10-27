/**
 * GenreService Tests
 * Tests for genre management functionality
 */

import { GenreService } from '../../services/GenreService';
import { ApiError } from '../../types/ApiError';

// Mock Prisma client
const mockPrisma = {
   genre: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
   },
} as any;

// Mock MessageHandler
jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => {
         const messages: Record<string, string> = {
            'genres.fetch_failed': 'Failed to fetch genres',
            'genres.not_found': 'Genre not found',
            'genres.create_failed': 'Failed to create genre',
            'genres.update_failed': 'Failed to update genre',
            'genres.delete_failed': 'Failed to delete genre',
            'genres.already_exists': 'Genre already exists',
         };
         return messages[key] || key;
      },
   },
}));

describe('GenreService', () => {
   let genreService: GenreService;

   beforeEach(() => {
      genreService = new GenreService(mockPrisma);
      jest.clearAllMocks();
   });

   describe('getAllGenres', () => {
      it('should return all genres sorted by name', async () => {
         const mockGenres = [
            {
               id: '1',
               name: 'Fantasy',
               createdAt: new Date('2024-01-01'),
               updatedAt: new Date('2024-01-02'),
            },
            {
               id: '2',
               name: 'Mystery',
               createdAt: new Date('2024-01-01'),
               updatedAt: new Date('2024-01-02'),
            },
            {
               id: '3',
               name: 'Science Fiction',
               createdAt: new Date('2024-01-01'),
               updatedAt: new Date('2024-01-02'),
            },
         ];

         mockPrisma.genre.findMany.mockResolvedValue(mockGenres);

         const result = await genreService.getAllGenres();

         expect(result).toHaveLength(3);
         if (result[0]) expect(result[0].name).toBe('Fantasy');
         if (result[1]) expect(result[1].name).toBe('Mystery');
         if (result[2]) expect(result[2].name).toBe('Science Fiction');
         expect(mockPrisma.genre.findMany).toHaveBeenCalledWith({
            orderBy: { name: 'asc' },
         });
      });

      it('should return empty array when no genres exist', async () => {
         mockPrisma.genre.findMany.mockResolvedValue([]);

         const result = await genreService.getAllGenres();

         expect(result).toEqual([]);
      });

      it('should handle database errors', async () => {
         const error = new Error('Database connection failed');
         mockPrisma.genre.findMany.mockRejectedValue(error);

         await expect(genreService.getAllGenres()).rejects.toThrow(ApiError);

         await expect(genreService.getAllGenres()).rejects.toThrow('Failed to fetch genres');
      });
   });

   describe('getGenreById', () => {
      it('should return genre when found', async () => {
         const mockGenre = {
            id: 'genre-1',
            name: 'Fantasy',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         };

         mockPrisma.genre.findUnique.mockResolvedValue(mockGenre);

         const result = await genreService.getGenreById('genre-1');

         expect(result.id).toBe('genre-1');
         expect(result.name).toBe('Fantasy');
         expect(mockPrisma.genre.findUnique).toHaveBeenCalledWith({
            where: { id: 'genre-1' },
         });
      });

      it('should throw ApiError when genre not found', async () => {
         mockPrisma.genre.findUnique.mockResolvedValue(null);

         await expect(genreService.getGenreById('non-existent')).rejects.toThrow(ApiError);
         await expect(genreService.getGenreById('non-existent')).rejects.toThrow('Genre not found');
      });

      it('should handle database errors', async () => {
         const error = new Error('Database error');
         mockPrisma.genre.findUnique.mockRejectedValue(error);

         await expect(genreService.getGenreById('genre-1')).rejects.toThrow('Failed to fetch genres');
      });
   });

   describe('getGenreByName', () => {
      it('should return genre when found', async () => {
         const mockGenre = {
            id: 'genre-1',
            name: 'Fantasy',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         };

         mockPrisma.genre.findFirst.mockResolvedValue(mockGenre);

         const result = await genreService.getGenreByName('Fantasy');

         expect(result).not.toBeNull();
         expect(result?.name).toBe('Fantasy');
         expect(mockPrisma.genre.findFirst).toHaveBeenCalledWith({
            where: {
               name: {
                  equals: 'Fantasy',
                  mode: 'insensitive',
               },
            },
         });
      });

      it('should return null when genre not found', async () => {
         mockPrisma.genre.findFirst.mockResolvedValue(null);

         const result = await genreService.getGenreByName('NonExistent');

         expect(result).toBeNull();
      });

      it('should be case insensitive', async () => {
         const mockGenre = {
            id: 'genre-1',
            name: 'Fantasy',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         };

         mockPrisma.genre.findFirst.mockResolvedValue(mockGenre);

         const result = await genreService.getGenreByName('FANTASY');

         expect(result).not.toBeNull();
         expect(result?.name).toBe('Fantasy');
      });

      it('should handle database errors', async () => {
         const error = new Error('Database error');
         mockPrisma.genre.findFirst.mockRejectedValue(error);

         await expect(genreService.getGenreByName('Fantasy')).rejects.toThrow('Failed to fetch genres');
      });
   });

   describe('Edge cases', () => {
      it('should handle single genre result', async () => {
         const mockGenre = {
            id: 'genre-1',
            name: 'Fantasy',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         };

         mockPrisma.genre.findMany.mockResolvedValue([mockGenre]);

         const result = await genreService.getAllGenres();

         expect(result).toHaveLength(1);
         if (result[0]) expect(result[0].name).toBe('Fantasy');
      });

      it('should handle very long genre names', async () => {
         const longName = 'A'.repeat(1000);
         const mockGenre = {
            id: 'genre-1',
            name: longName,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         };

         mockPrisma.genre.findFirst.mockResolvedValue(mockGenre);

         const result = await genreService.getGenreByName(longName);

         expect(result?.name.length).toBe(1000);
      });

      it('should handle special characters in genre names', async () => {
         const mockGenre = {
            id: 'genre-1',
            name: "Horror/Suspense & Thriller's",
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         };

         mockPrisma.genre.findFirst.mockResolvedValue(mockGenre);

         const result = await genreService.getGenreByName("Horror/Suspense & Thriller's");

         expect(result?.name).toBe("Horror/Suspense & Thriller's");
      });

      it('should handle unicode characters', async () => {
         const mockGenre = {
            id: 'genre-1',
            name: 'Mythologie Français',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
         };

         mockPrisma.genre.findFirst.mockResolvedValue(mockGenre);

         const result = await genreService.getGenreByName('Mythologie Français');

         expect(result?.name).toBe('Mythologie Français');
      });
   });
});

