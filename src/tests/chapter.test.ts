/**
 * Chapter Service Tests
 * Tests for chapter management functionality
 */
// import { PrismaClient } from '@prisma/client';
import { ChapterService } from '../services/ChapterService';
import { CreateChapterRequest } from '../models/ChapterDto';

// Mock Prisma client
const mockPrisma = {
   chapter: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
   },
   audiobook: {
      findUnique: jest.fn(),
   },
   chapterProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
   },
} as any;

describe('ChapterService', () => {
   let chapterService: ChapterService;

   beforeEach(() => {
      chapterService = new ChapterService(mockPrisma);
      jest.clearAllMocks();
   });

   describe('getChaptersByAudiobookId', () => {
      it('should return chapters for an audiobook', async () => {
         const mockChapters = [
            {
               id: 'chapter-1',
               audiobookId: 'audiobook-1',
               title: 'Chapter 1',
               chapterNumber: 1,
               duration: 1800,
               filePath: '/path/to/chapter1.mp3',
               fileSize: BigInt(50000000),
               startPosition: 0,
               endPosition: 1800,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         ];

         mockPrisma.chapter.findMany.mockResolvedValue(mockChapters);
         mockPrisma.chapter.count.mockResolvedValue(1);

         const result = await chapterService.getChaptersByAudiobookId('audiobook-1');

         expect(result.chapters).toHaveLength(1);
         expect(result.totalCount).toBe(1);
         expect(mockPrisma.chapter.findMany).toHaveBeenCalledWith({
            where: { audiobookId: 'audiobook-1' },
            include: expect.any(Object),
            orderBy: { chapterNumber: 'asc' },
            skip: 0,
            take: 50,
         });
      });
   });

   describe('getChapterById', () => {
      it('should return a chapter by ID', async () => {
         const mockChapter = {
            id: 'chapter-1',
            audiobookId: 'audiobook-1',
            title: 'Chapter 1',
            chapterNumber: 1,
            duration: 1800,
            filePath: '/path/to/chapter1.mp3',
            fileSize: BigInt(50000000),
            startPosition: 0,
            endPosition: 1800,
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         mockPrisma.chapter.findUnique.mockResolvedValue(mockChapter);

         const result = await chapterService.getChapterById('chapter-1');

         expect(result).toEqual(mockChapter);
         expect(mockPrisma.chapter.findUnique).toHaveBeenCalledWith({
            where: { id: 'chapter-1' },
            include: expect.any(Object),
         });
      });

      it('should throw error if chapter not found', async () => {
         mockPrisma.chapter.findUnique.mockResolvedValue(null);

         await expect(chapterService.getChapterById('non-existent')).rejects.toThrow('Chapter not found');
      });
   });

   describe('createChapter', () => {
      it('should create a new chapter', async () => {
         const chapterData: CreateChapterRequest = {
            audiobookId: 'audiobook-1',
            title: 'Chapter 1',
            chapterNumber: 1,
            duration: 1800,
            filePath: '/path/to/chapter1.mp3',
            fileSize: 50000000,
            startPosition: 0,
            endPosition: 1800,
         };

         const mockAudiobook = { id: 'audiobook-1', title: 'Test Audiobook' };
         const mockChapter = {
            id: 'chapter-1',
            ...chapterData,
            fileSize: BigInt(chapterData.fileSize),
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         mockPrisma.audiobook.findUnique.mockResolvedValue(mockAudiobook);
         mockPrisma.chapter.findFirst.mockResolvedValue(null);
         mockPrisma.chapter.create.mockResolvedValue(mockChapter);

         const result = await chapterService.createChapter(chapterData);

         expect(result).toEqual(mockChapter);
         expect(mockPrisma.chapter.create).toHaveBeenCalledWith({
            data: {
               ...chapterData,
               fileSize: BigInt(chapterData.fileSize),
            },
         });
      });

      it('should throw error if audiobook not found', async () => {
         const chapterData: CreateChapterRequest = {
            audiobookId: 'non-existent',
            title: 'Chapter 1',
            chapterNumber: 1,
            duration: 1800,
            filePath: '/path/to/chapter1.mp3',
            fileSize: 50000000,
            startPosition: 0,
            endPosition: 1800,
         };

         mockPrisma.audiobook.findUnique.mockResolvedValue(null);

         await expect(chapterService.createChapter(chapterData)).rejects.toThrow('Audiobook not found');
      });

      it('should throw error if chapter number already exists', async () => {
         const chapterData: CreateChapterRequest = {
            audiobookId: 'audiobook-1',
            title: 'Chapter 1',
            chapterNumber: 1,
            duration: 1800,
            filePath: '/path/to/chapter1.mp3',
            fileSize: 50000000,
            startPosition: 0,
            endPosition: 1800,
         };

         const mockAudiobook = { id: 'audiobook-1', title: 'Test Audiobook' };
         const existingChapter = { id: 'existing-chapter', chapterNumber: 1 };

         mockPrisma.audiobook.findUnique.mockResolvedValue(mockAudiobook);
         mockPrisma.chapter.findFirst.mockResolvedValue(existingChapter);

         await expect(chapterService.createChapter(chapterData)).rejects.toThrow('Chapter number already exists for this audiobook');
      });
   });

   describe('updateChapterProgress', () => {
      it('should update chapter progress for a user', async () => {
         const userId = 'user-1';
         const chapterId = 'chapter-1';
         const progressData = {
            currentPosition: 300,
            completed: false,
         };

         const mockChapter = {
            id: chapterId,
            duration: 1800,
         };

         const mockProgress = {
            id: 'progress-1',
            userId,
            chapterId,
            currentPosition: 300,
            completed: false,
            lastListenedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         mockPrisma.chapter.findUnique.mockResolvedValue(mockChapter);
         mockPrisma.chapterProgress.upsert.mockResolvedValue(mockProgress);

         const result = await chapterService.updateChapterProgress(userId, chapterId, progressData);

         expect(result).toEqual(mockProgress);
         expect(mockPrisma.chapterProgress.upsert).toHaveBeenCalledWith({
            where: {
               userId_chapterId: {
                  userId,
                  chapterId,
               },
            },
            update: {
               currentPosition: 300,
               completed: false,
               lastListenedAt: expect.any(Date),
            },
            create: {
               userId,
               chapterId,
               currentPosition: 300,
               completed: false,
               lastListenedAt: expect.any(Date),
            },
         });
      });

      it('should throw error if position exceeds chapter duration', async () => {
         const userId = 'user-1';
         const chapterId = 'chapter-1';
         const progressData = {
            currentPosition: 2000, // Exceeds duration
            completed: false,
         };

         const mockChapter = {
            id: chapterId,
            duration: 1800,
         };

         mockPrisma.chapter.findUnique.mockResolvedValue(mockChapter);

         await expect(chapterService.updateChapterProgress(userId, chapterId, progressData)).rejects.toThrow('Position cannot exceed chapter duration');
      });
   });

   describe('calculateAudiobookProgress', () => {
      it('should calculate overall audiobook progress', async () => {
         const userId = 'user-1';
         const audiobookId = 'audiobook-1';

         const mockChaptersWithProgress = [
            {
               id: 'chapter-1',
               duration: 1800,
               overallProgress: 50, // 50% complete
            },
            {
               id: 'chapter-2',
               duration: 1800,
               overallProgress: 100, // 100% complete
            },
            {
               id: 'chapter-3',
               duration: 1800,
               overallProgress: 0, // 0% complete
            },
         ];

         // Mock the getChaptersWithProgress method
         jest.spyOn(chapterService, 'getChaptersWithProgress').mockResolvedValue(mockChaptersWithProgress as any);

         const result = await chapterService.calculateAudiobookProgress(userId, audiobookId);

         // Expected: (50 + 100 + 0) / 3 = 50
         expect(result).toBe(50);
      });

      it('should return 0 if no chapters', async () => {
         const userId = 'user-1';
         const audiobookId = 'audiobook-1';

         jest.spyOn(chapterService, 'getChaptersWithProgress').mockResolvedValue([]);

         const result = await chapterService.calculateAudiobookProgress(userId, audiobookId);

         expect(result).toBe(0);
      });
   });
});
