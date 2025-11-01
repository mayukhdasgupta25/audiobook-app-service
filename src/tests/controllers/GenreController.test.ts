/**
 * GenreController Tests
 * Tests for HTTP request handling and response formatting
 */
import { PrismaClient } from '@prisma/client';
import { GenreController } from '../../controllers/GenreController';
import { GenreService } from '../../services/GenreService';
import { ResponseHandler } from '../../utils/ResponseHandler';
import { MessageHandler } from '../../utils/MessageHandler';
import { ApiError } from '../../types/ApiError';
import { HttpStatusCode } from '../../types/common';

// Mock dependencies
jest.mock('../../services/GenreService');
jest.mock('../../utils/ResponseHandler');
jest.mock('../../utils/MessageHandler');

describe('GenreController', () => {
   let genreController: GenreController;
   let mockPrisma: PrismaClient;
   let mockReq: any;
   let mockRes: any;
   let mockGenreService: jest.Mocked<GenreService>;
   let mockNext: jest.Mock;

   beforeEach(() => {
      // Create mock Prisma
      mockPrisma = {} as PrismaClient;

      // Create mock request
      mockReq = {
         params: {},
         query: {},
         body: {},
         originalUrl: '/api/v1/genres',
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
      genreController = new GenreController(mockPrisma);

      // Get the mocked GenreService instance
      mockGenreService = (genreController as any).genreService;
   });

   describe('getAllGenres', () => {
      it('should retrieve all genres and send success response', async () => {
         const mockGenres = [
            { id: 'genre-1', name: 'Fiction', createdAt: new Date(), updatedAt: new Date() },
            { id: 'genre-2', name: 'Mystery', createdAt: new Date(), updatedAt: new Date() },
         ];

         mockGenreService.getAllGenres.mockResolvedValue(mockGenres);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Genres retrieved successfully');

         await genreController.getAllGenres(mockReq, mockRes, mockNext);

         expect(mockGenreService.getAllGenres).toHaveBeenCalledTimes(1);
         expect(MessageHandler.getSuccessMessage).toHaveBeenCalledWith('genres.retrieved');
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockGenres,
            'Genres retrieved successfully'
         );
      });

      it('returns list', async () => {
         mockGenreService.getAllGenres.mockResolvedValue([{ id: 'g1', name: 'Fiction' } as any]);
         await genreController.getAllGenres(mockReq, mockRes, mockNext);
         expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, [{ id: 'g1', name: 'Fiction' }], 'genres.retrieved');
      });

      it('should handle empty genres list', async () => {
         const emptyGenres: any[] = [];

         mockGenreService.getAllGenres.mockResolvedValue(emptyGenres);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Genres retrieved successfully');

         await genreController.getAllGenres(mockReq, mockRes, mockNext);

         expect(mockGenreService.getAllGenres).toHaveBeenCalledTimes(1);
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            emptyGenres,
            'Genres retrieved successfully'
         );
      });

      it('should propagate service errors', async () => {
         const error = new ApiError('Internal server error', HttpStatusCode.INTERNAL_SERVER_ERROR);
         mockGenreService.getAllGenres.mockRejectedValue(error);

         try {
            await genreController.getAllGenres(mockReq, mockRes, mockNext);
         } catch (e) {
            expect(e).toEqual(error);
         }
         expect(mockGenreService.getAllGenres).toHaveBeenCalledTimes(1);
         expect(ResponseHandler.success).not.toHaveBeenCalled();
      });

      it('should call ResponseHandler with correct parameters', async () => {
         const mockGenres = [{ id: 'genre-1', name: 'Fiction', createdAt: new Date(), updatedAt: new Date() }];
         mockGenreService.getAllGenres.mockResolvedValue(mockGenres);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Success message');

         await genreController.getAllGenres(mockReq, mockRes, mockNext);

         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockGenres,
            'Success message'
         );
      });
   });

   describe('createGenre', () => {
      it('creates and returns 201', async () => {
         mockReq.body = { name: 'Fiction' };
         mockGenreService.createGenre.mockResolvedValue({ id: 'g1', name: 'Fiction' } as any);
         await genreController.createGenre(mockReq, mockRes, mockNext);
         expect(mockGenreService.createGenre).toHaveBeenCalledWith('Fiction');
         expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, { id: 'g1', name: 'Fiction' }, 'genres.created', 201);
      });
   });

   describe('getGenreById', () => {
      it('returns genre', async () => {
         mockReq.params = { id: 'g1' };
         mockGenreService.getGenreById.mockResolvedValue({ id: 'g1', name: 'Fiction' } as any);
         await genreController.getGenreById(mockReq, mockRes, mockNext);
         expect(mockGenreService.getGenreById).toHaveBeenCalledWith('g1');
         expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, { id: 'g1', name: 'Fiction' }, 'genres.retrieved');
      });
   });

   describe('updateGenre', () => {
      it('updates and returns genre', async () => {
         mockReq.params = { id: 'g1' };
         mockReq.body = { name: 'New' };
         mockGenreService.updateGenre.mockResolvedValue({ id: 'g1', name: 'New' } as any);
         await genreController.updateGenre(mockReq, mockRes, mockNext);
         expect(mockGenreService.updateGenre).toHaveBeenCalledWith('g1', 'New');
         expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, { id: 'g1', name: 'New' }, 'genres.updated');
      });
   });

   describe('deleteGenre', () => {
      it('deletes and returns success', async () => {
         mockReq.params = { id: 'g1' };
         mockGenreService.deleteGenre.mockResolvedValue(true);
         await genreController.deleteGenre(mockReq, mockRes, mockNext);
         expect(mockGenreService.deleteGenre).toHaveBeenCalledWith('g1');
         expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, { deleted: true }, 'genres.deleted');
      });
   });
});
