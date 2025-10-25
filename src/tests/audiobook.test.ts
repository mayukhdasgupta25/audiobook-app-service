/**
 * AudioBook API Tests
 * Comprehensive test suite for the AudioBook API endpoints using Jest
 */

// Mock Prisma Client before any imports
jest.mock('@prisma/client', () => {
   const mockPrismaClientKnownRequestError = jest.fn().mockImplementation((message, code) => ({
      message,
      code,
      name: 'PrismaClientKnownRequestError'
   }));

   return {
      PrismaClient: jest.fn().mockImplementation(() => ({
         audioBook: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            aggregate: jest.fn(),
            groupBy: jest.fn()
         }
      })),
      Prisma: {
         PrismaClientKnownRequestError: mockPrismaClientKnownRequestError
      }
   };
});

import { PrismaClient } from '@prisma/client';
import { AudioBookService } from '../services/AudioBookService';
import { ApiError } from '../types/ApiError';
import { HttpStatusCode } from '../types/common';

describe('AudioBook Service Tests', () => {
   let audioBookService: AudioBookService;
   let mockPrisma: any;

   beforeEach(() => {
      mockPrisma = new PrismaClient();
      audioBookService = new AudioBookService(mockPrisma);
      jest.clearAllMocks();
   });

   describe('getAllAudioBooks', () => {
      it('should return paginated audiobooks', async () => {
         const mockAudioBooks = [
            {
               id: 'test-id-1',
               title: 'Test AudioBook 1',
               author: 'Test Author',
               duration: 3600,
               fileSize: BigInt(52428800),
               language: 'en',
               isActive: true,
               isPublic: true,
               createdAt: new Date(),
               updatedAt: new Date()
            }
         ];

         mockPrisma.audioBook.findMany.mockResolvedValue(mockAudioBooks);
         mockPrisma.audioBook.count.mockResolvedValue(1);

         const result = await audioBookService.getAllAudioBooks({
            page: 1,
            limit: 10
         });

         expect(result.audiobooks).toHaveLength(1);
         expect(result.totalCount).toBe(1);
         expect(mockPrisma.audioBook.findMany).toHaveBeenCalled();
         expect(mockPrisma.audioBook.count).toHaveBeenCalled();
      });

      it('should handle filtering parameters', async () => {
         mockPrisma.audioBook.findMany.mockResolvedValue([]);
         mockPrisma.audioBook.count.mockResolvedValue(0);

         await audioBookService.getAllAudioBooks({
            genreId: 'fiction',
            isActive: true,
            search: 'test'
         });

         expect(mockPrisma.audioBook.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
               where: expect.objectContaining({
                  genreId: 'fiction',
                  isActive: true,
                  OR: expect.any(Array)
               })
            })
         );
      });
   });

   describe('getAudioBookById', () => {
      it('should return audiobook when found', async () => {
         const mockAudioBook = {
            id: 'test-id',
            title: 'Test AudioBook',
            author: 'Test Author',
            duration: 3600,
            fileSize: BigInt(52428800),
            filePath: '/test/path.mp3',
            language: 'en',
            isActive: true,
            isPublic: true,
            createdAt: new Date(),
            updatedAt: new Date()
         };

         mockPrisma.audioBook.findUnique.mockResolvedValue(mockAudioBook);

         const result = await audioBookService.getAudioBookById('test-id');

         expect(result.id).toBe('test-id');
         expect(result.title).toBe('Test AudioBook');
         expect(mockPrisma.audioBook.findUnique).toHaveBeenCalledWith({
            where: { id: 'test-id' },
            include: {
               audiobookTags: {
                  include: {
                     tag: true
                  }
               },
               genre: true
            }
         });
      });

      it('should throw not found error when audiobook does not exist', async () => {
         mockPrisma.audioBook.findUnique.mockResolvedValue(null);

         await expect(audioBookService.getAudioBookById('non-existent-id'))
            .rejects
            .toThrow(ApiError);

         await expect(audioBookService.getAudioBookById('non-existent-id'))
            .rejects
            .toThrow('AudioBook not found');
      });
   });

   describe('createAudioBook', () => {
      it('should create audiobook with valid data', async () => {
         const createData = {
            title: 'New AudioBook',
            author: 'New Author',
            duration: 3600,
            fileSize: 52428800
         };

         const mockCreatedAudioBook = {
            id: 'new-id',
            ...createData,
            fileSize: BigInt(createData.fileSize),
            language: 'en',
            isActive: true,
            isPublic: true,
            createdAt: new Date(),
            updatedAt: new Date()
         };

         mockPrisma.audioBook.create.mockResolvedValue(mockCreatedAudioBook);

         const result = await audioBookService.createAudioBook(createData);

         expect(result.title).toBe('New AudioBook');
         expect(result.author).toBe('New Author');
         expect(mockPrisma.audioBook.create).toHaveBeenCalledWith(
            expect.objectContaining({
               data: expect.objectContaining({
                  title: 'New AudioBook',
                  author: 'New Author',
                  language: 'en',
                  isActive: true,
                  isPublic: true
               })
            })
         );
      });

      it('should validate required fields', async () => {
         const invalidData = {
            title: '',
            author: 'Test Author',
            duration: 3600,
            fileSize: 52428800,
            filePath: '/test/path.mp3'
         };

         await expect(audioBookService.createAudioBook(invalidData))
            .rejects
            .toThrow(ApiError);

         await expect(audioBookService.createAudioBook(invalidData))
            .rejects
            .toThrow('Title is required');
      });

      it('should validate duration is positive', async () => {
         const invalidData = {
            title: 'Test Title',
            author: 'Test Author',
            duration: 0,
            fileSize: 52428800,
            filePath: '/test/path.mp3'
         };

         await expect(audioBookService.createAudioBook(invalidData))
            .rejects
            .toThrow('Duration must be a positive number');
      });
   });

   describe('getAudioBookStats', () => {
      it('should return audiobook statistics', async () => {
         mockPrisma.audioBook.count
            .mockResolvedValueOnce(100) // total
            .mockResolvedValueOnce(95)  // active
            .mockResolvedValueOnce(90); // public

         mockPrisma.audioBook.aggregate.mockResolvedValue({
            _sum: { duration: 360000 },
            _avg: { duration: 3600 }
         });

         const result = await audioBookService.getAudioBookStats();

         expect(result.totalAudioBooks).toBe(100);
         expect(result.activeAudioBooks).toBe(95);
         expect(result.publicAudioBooks).toBe(90);
         expect(result.totalDuration).toBe(360000);
         expect(result.averageDuration).toBe(3600);
      });
   });

   describe('getAudioBooksByTags', () => {
      it('should return audiobooks filtered by tags', async () => {
         const mockAudioBooks = [
            {
               id: '1',
               title: 'Test Book 1',
               author: 'Test Author',
               audiobookTags: [
                  { tag: { name: 'fiction' } },
                  { tag: { name: 'adventure' } }
               ],
               genre: { name: 'Fiction' }
            }
         ];

         const mockCount = 1;

         mockPrisma.audioBook.findMany.mockResolvedValue(mockAudioBooks);
         mockPrisma.audioBook.count.mockResolvedValue(mockCount);

         const tags = ['fiction', 'adventure'];
         const params = {
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc' as const
         };

         const result = await audioBookService.getAudioBooksByTags(tags, params);

         expect(result.audiobooks).toHaveLength(1);
         expect(result.totalCount).toBe(1);
         expect(mockPrisma.audioBook.findMany).toHaveBeenCalledWith({
            where: {
               audiobookTags: {
                  some: {
                     tag: {
                        name: {
                           in: tags
                        }
                     }
                  }
               }
            },
            orderBy: { createdAt: 'desc' },
            skip: 0,
            take: 10,
            include: {
               audiobookTags: {
                  include: {
                     tag: true
                  }
               },
               genre: true
            }
         });
      });

      it('should handle empty tag list', async () => {
         const tags: string[] = [];
         const params = {
            page: 1,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'desc' as const
         };

         await expect(audioBookService.getAudioBooksByTags(tags, params))
            .rejects
            .toThrow();
      });
   });
});

describe('ApiError Tests', () => {
   it('should create validation error', () => {
      const error = ApiError.validationError('Test validation error');

      expect(error.message).toBe('Test validation error');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.errorType).toBe('VALIDATION_ERROR');
   });

   it('should create not found error', () => {
      const error = ApiError.notFound('Resource');

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(HttpStatusCode.NOT_FOUND);
      expect(error.errorType).toBe('NOT_FOUND');
   });

   it('should convert to JSON format', () => {
      const error = ApiError.internalError('Test error');
      const json = error.toJSON();

      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('statusCode');
      expect(json).toHaveProperty('errorType');
      expect(json).toHaveProperty('timestamp');
   });
});
