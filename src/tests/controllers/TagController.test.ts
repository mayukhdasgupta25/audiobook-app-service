/**
 * TagController Tests
 * Tests for HTTP request handling and response formatting
 */
import { PrismaClient } from '@prisma/client';
import { TagController } from '../../controllers/TagController';
import { TagService } from '../../services/TagService';
import { ResponseHandler } from '../../utils/ResponseHandler';
import { MessageHandler } from '../../utils/MessageHandler';
import { ApiError } from '../../types/ApiError';
import { HttpStatusCode } from '../../types/common';

// Mock dependencies
jest.mock('../../services/TagService');
jest.mock('../../utils/ResponseHandler');
jest.mock('../../utils/MessageHandler');

describe('TagController', () => {
   let tagController: TagController;
   let mockPrisma: PrismaClient;
   let mockReq: any;
   let mockRes: any;
   let mockTagService: jest.Mocked<TagService>;
   let mockNext: jest.Mock;

   beforeEach(() => {
      // Create mock Prisma
      mockPrisma = {} as PrismaClient;

      // Create mock request
      mockReq = {
         params: {},
         query: {},
         body: {},
         originalUrl: '/api/v1/tags',
      } as any;

      // Create mock response
      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis(),
         send: jest.fn().mockReturnThis(),
      } as any;

      // Mock next function for async handler
      mockNext = jest.fn();

      // Setup MessageHandler mock
      (MessageHandler.getSuccessMessage as jest.Mock).mockImplementation((k: string) => k);

      // Clear all mocks
      jest.clearAllMocks();

      // Create controller instance
      tagController = new TagController(mockPrisma);

      // Get the mocked TagService instance
      mockTagService = (tagController as any).tagService;
   });

   describe('getAllTags', () => {
      it('should retrieve all tags and send success response', async () => {
         const mockTags = [
            { id: 'tag-1', name: 'Trending', type: 'TRENDING', createdAt: new Date(), updatedAt: new Date() },
            { id: 'tag-2', name: 'New Releases', type: 'NEW_RELEASES', createdAt: new Date(), updatedAt: new Date() },
         ];

         mockTagService.getAllTags.mockResolvedValue(mockTags);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Tags retrieved successfully');

         await tagController.getAllTags(mockReq, mockRes, mockNext);

         expect(mockTagService.getAllTags).toHaveBeenCalledTimes(1);
         expect(MessageHandler.getSuccessMessage).toHaveBeenCalledWith('tags.retrieved');
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockTags,
            'Tags retrieved successfully'
         );
      });

      it('returns list', async () => {
         mockTagService.getAllTags.mockResolvedValue([{ id: 't1', name: 'Trending', type: 'TRENDING' } as any]);
         await tagController.getAllTags(mockReq, mockRes, mockNext);
         expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, [{ id: 't1', name: 'Trending', type: 'TRENDING' }], 'tags.retrieved');
      });

      it('should handle empty tags list', async () => {
         const emptyTags: any[] = [];

         mockTagService.getAllTags.mockResolvedValue(emptyTags);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Tags retrieved successfully');

         await tagController.getAllTags(mockReq, mockRes, mockNext);

         expect(mockTagService.getAllTags).toHaveBeenCalledTimes(1);
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            emptyTags,
            'Tags retrieved successfully'
         );
      });

      it('should propagate service errors', async () => {
         const error = new ApiError('Internal server error', HttpStatusCode.INTERNAL_SERVER_ERROR);
         mockTagService.getAllTags.mockRejectedValue(error);

         try {
            await tagController.getAllTags(mockReq, mockRes, mockNext);
         } catch (e) {
            expect(e).toEqual(error);
         }
         expect(mockTagService.getAllTags).toHaveBeenCalledTimes(1);
         expect(ResponseHandler.success).not.toHaveBeenCalled();
      });

      it('should call ResponseHandler with correct parameters', async () => {
         const mockTags = [{ id: 'tag-1', name: 'Trending', type: 'TRENDING', createdAt: new Date(), updatedAt: new Date() }];
         mockTagService.getAllTags.mockResolvedValue(mockTags);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Success message');

         await tagController.getAllTags(mockReq, mockRes, mockNext);

         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockTags,
            'Success message'
         );
      });
   });

   describe('getTagById', () => {
      it('returns tag', async () => {
         mockReq.params = { id: 't1' };
         mockTagService.getTagById.mockResolvedValue({ id: 't1', name: 'Trending', type: 'TRENDING' } as any);
         await tagController.getTagById(mockReq, mockRes, mockNext);
         expect(mockTagService.getTagById).toHaveBeenCalledWith('t1');
         expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, { id: 't1', name: 'Trending', type: 'TRENDING' }, 'tags.retrieved');
      });

      it('should retrieve tag by id and send success response', async () => {
         const mockTag = {
            id: 'tag-1',
            name: 'Trending',
            type: 'TRENDING',
            createdAt: new Date(),
            updatedAt: new Date()
         };

         mockReq.params = { id: 'tag-1' };
         mockTagService.getTagById.mockResolvedValue(mockTag);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Tags retrieved successfully');

         await tagController.getTagById(mockReq, mockRes, mockNext);

         expect(mockTagService.getTagById).toHaveBeenCalledWith('tag-1');
         expect(MessageHandler.getSuccessMessage).toHaveBeenCalledWith('tags.retrieved');
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockTag,
            'Tags retrieved successfully'
         );
      });

      it('should handle tag not found error', async () => {
         const error = new ApiError('Tag not found', HttpStatusCode.NOT_FOUND);
         mockReq.params = { id: 'non-existent-tag' };
         mockTagService.getTagById.mockRejectedValue(error);

         try {
            await tagController.getTagById(mockReq, mockRes, mockNext);
         } catch (e) {
            expect(e).toEqual(error);
         }
         expect(mockTagService.getTagById).toHaveBeenCalledWith('non-existent-tag');
         expect(ResponseHandler.success).not.toHaveBeenCalled();
      });

      it('should propagate service errors', async () => {
         const error = new ApiError('Internal server error', HttpStatusCode.INTERNAL_SERVER_ERROR);
         mockReq.params = { id: 'tag-1' };
         mockTagService.getTagById.mockRejectedValue(error);

         try {
            await tagController.getTagById(mockReq, mockRes, mockNext);
         } catch (e) {
            expect(e).toEqual(error);
         }
         expect(mockTagService.getTagById).toHaveBeenCalledTimes(1);
         expect(ResponseHandler.success).not.toHaveBeenCalled();
      });

      it('should call ResponseHandler with correct parameters', async () => {
         const mockTag = { id: 'tag-1', name: 'Trending', type: 'TRENDING', createdAt: new Date(), updatedAt: new Date() };
         mockReq.params = { id: 'tag-1' };
         mockTagService.getTagById.mockResolvedValue(mockTag);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Success message');

         await tagController.getTagById(mockReq, mockRes, mockNext);

         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockTag,
            'Success message'
         );
      });
   });
});

