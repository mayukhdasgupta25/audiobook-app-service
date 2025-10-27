/**
 * ChapterController Tests
 * Tests for HTTP request handling and response formatting
 */

import { PrismaClient } from '@prisma/client';
import { ChapterController } from '../../controllers/ChapterController';
import { ChapterService } from '../../services/ChapterService';
import { ResponseHandler } from '../../utils/ResponseHandler';
import { MessageHandler } from '../../utils/MessageHandler';
import { ApiError } from '../../types/ApiError';
import { HttpStatusCode } from '../../types/common';

// Mock dependencies
jest.mock('../../services/ChapterService');
jest.mock('../../utils/ResponseHandler');
jest.mock('../../utils/MessageHandler');

describe('ChapterController', () => {
   let chapterController: ChapterController;
   let mockPrisma: PrismaClient;
   let mockReq: any;
   let mockRes: any;
   let mockChapterService: jest.Mocked<ChapterService>;

   beforeEach(() => {
      mockPrisma = {} as PrismaClient;
      mockReq = {
         params: {},
         query: {},
         body: {},
         file: undefined,
         originalUrl: '/api/v1/chapters',
      } as any;
      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis(),
         send: jest.fn().mockReturnThis(),
      } as any;

      // Mock next function for async handler
      mockReq.next = jest.fn();

      jest.clearAllMocks();
      chapterController = new ChapterController(mockPrisma);
      mockChapterService = (chapterController as any).chapterService;
   });

   describe('getChaptersByAudiobookId', () => {
      it('should retrieve chapters with default pagination', async () => {
         mockReq.params.audiobookId = 'audiobook-123';
         mockReq.query = {};

         const mockChapters = [
            { id: 'chapter-1', title: 'Chapter 1', audiobookId: 'audiobook-123', chapterNumber: 1 },
            { id: 'chapter-2', title: 'Chapter 2', audiobookId: 'audiobook-123', chapterNumber: 2 },
         ];

         mockChapterService.getChaptersByAudiobookId.mockResolvedValue({
            chapters: mockChapters as any,
            totalCount: 2
         });
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Chapters retrieved');
         (ResponseHandler.calculatePagination as jest.Mock).mockReturnValue({
            currentPage: 1,
            totalPages: 1,
            totalItems: 2,
            itemsPerPage: 50,
            hasNextPage: false,
            hasPreviousPage: false,
         });

         await chapterController.getChaptersByAudiobookId(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.getChaptersByAudiobookId).toHaveBeenCalledWith(
            'audiobook-123',
            expect.objectContaining({
               audiobookId: 'audiobook-123',
               page: 1,
               limit: 50,
               sortBy: 'chapterNumber',
               sortOrder: 'asc',
            })
         );
         expect(ResponseHandler.paginated).toHaveBeenCalled();
      });

      it('should parse query parameters correctly', async () => {
         mockReq.params.audiobookId = 'audiobook-123';
         mockReq.query = {
            page: '2',
            limit: '20',
            sortBy: 'title',
            sortOrder: 'desc'
         };

         mockChapterService.getChaptersByAudiobookId.mockResolvedValue({
            chapters: [],
            totalCount: 0
         });
         (ResponseHandler.calculatePagination as jest.Mock).mockReturnValue({
            currentPage: 2,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 20,
            hasNextPage: false,
            hasPreviousPage: true,
         });

         await chapterController.getChaptersByAudiobookId(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.getChaptersByAudiobookId).toHaveBeenCalledWith(
            'audiobook-123',
            expect.objectContaining({
               page: 2,
               limit: 20,
               sortBy: 'title',
               sortOrder: 'desc',
            })
         );
      });
   });

   describe('getChapterById', () => {
      it('should retrieve chapter by ID', async () => {
         mockReq.params.id = 'chapter-123';
         const mockChapter = { id: 'chapter-123', title: 'Test Chapter', audiobookId: 'audiobook-123' };

         mockChapterService.getChapterById.mockResolvedValue(mockChapter as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Chapter retrieved');

         await chapterController.getChapterById(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.getChapterById).toHaveBeenCalledWith('chapter-123');
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockChapter,
            'Chapter retrieved'
         );
      });
   });

   describe('createChapter', () => {
      it('should create chapter with form data', async () => {
         mockReq.body = {
            audiobookId: 'audiobook-123',
            title: 'New Chapter',
            chapterNumber: '1',
            duration: '1800',
            startPosition: '0',
            endPosition: '1800',
         };

         const mockChapter = { id: 'chapter-new', title: 'New Chapter', audiobookId: 'audiobook-123' };

         mockChapterService.createChapter.mockResolvedValue(mockChapter as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Chapter created');

         await chapterController.createChapter(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.createChapter).toHaveBeenCalled();
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockChapter,
            'Chapter created',
            HttpStatusCode.CREATED
         );
      });

      it('should handle file upload', async () => {
         mockReq.body = {
            audiobookId: 'audiobook-123',
            title: 'Chapter with Audio',
            chapterNumber: '1',
            duration: '1800',
            startPosition: '0',
            endPosition: '1800',
         };
         mockReq.file = {
            path: '/uploads/audio.mp3',
            size: 1024000
         };

         const mockChapter = { id: 'chapter-new', title: 'Chapter with Audio' };
         mockChapterService.createChapter.mockResolvedValue(mockChapter as any);

         await chapterController.createChapter(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.createChapter).toHaveBeenCalledWith(
            expect.objectContaining({
               audiobookId: 'audiobook-123',
               title: 'Chapter with Audio',
               chapterNumber: 1,
               duration: 1800,
            }),
            mockReq.file
         );
      });
   });

   describe('updateChapter', () => {
      it('should update chapter successfully', async () => {
         mockReq.params.id = 'chapter-123';
         mockReq.body = {
            title: 'Updated Chapter',
            duration: 1900
         };

         const mockChapter = { id: 'chapter-123', title: 'Updated Chapter' };
         mockChapterService.updateChapter.mockResolvedValue(mockChapter as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Chapter updated');

         await chapterController.updateChapter(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.updateChapter).toHaveBeenCalledWith('chapter-123', mockReq.body);
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockChapter,
            'Chapter updated'
         );
      });
   });

   describe('deleteChapter', () => {
      it('should delete chapter and return no content', async () => {
         mockReq.params.id = 'chapter-123';

         mockChapterService.deleteChapter.mockResolvedValue(undefined);

         await chapterController.deleteChapter(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.deleteChapter).toHaveBeenCalledWith('chapter-123');
         expect(ResponseHandler.noContent).toHaveBeenCalledWith(mockRes);
      });
   });

   describe('getChapterProgress', () => {
      it('should retrieve chapter progress for authenticated user', async () => {
         mockReq.params.id = 'chapter-123';
         mockReq.user = { id: 'user-123' };

         const mockProgress = { chapterId: 'chapter-123', currentPosition: 300, completed: false };
         mockChapterService.getChapterProgress.mockResolvedValue(mockProgress as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Progress retrieved');

         await chapterController.getChapterProgress(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.getChapterProgress).toHaveBeenCalledWith('user-123', 'chapter-123');
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockProgress,
            'Progress retrieved'
         );
      });
   });

   describe('updateChapterProgress', () => {
      it('should update chapter progress for authenticated user', async () => {
         mockReq.params.id = 'chapter-123';
         mockReq.user = { id: 'user-123' };
         mockReq.body = {
            currentPosition: 600,
            completed: false
         };

         const mockProgress = { chapterId: 'chapter-123', currentPosition: 600, completed: false };
         mockChapterService.updateChapterProgress.mockResolvedValue(mockProgress as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Progress updated');

         await chapterController.updateChapterProgress(mockReq, mockRes, mockReq.next);

         expect(mockChapterService.updateChapterProgress).toHaveBeenCalledWith(
            'user-123',
            'chapter-123',
            mockReq.body
         );
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockProgress,
            'Progress updated'
         );
      });
   });

   describe('error handling', () => {
      it('should propagate service errors', async () => {
         mockReq.params.id = 'chapter-123';
         const error = new ApiError('Chapter not found', HttpStatusCode.NOT_FOUND);
         mockChapterService.getChapterById.mockRejectedValue(error);

         try {
            await chapterController.getChapterById(mockReq, mockRes, mockReq.next);
         } catch (e) {
            expect(e).toEqual(error);
         }
      });
   });
});

