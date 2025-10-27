/**
 * AudioBookController Tests
 * Tests for HTTP request handling with complex query parameters and file uploads
 */

import { PrismaClient } from '@prisma/client';
import { AudioBookController } from '../../controllers/AudioBookController';
import { AudioBookService } from '../../services/AudioBookService';
import { ResponseHandler } from '../../utils/ResponseHandler';
import { MessageHandler } from '../../utils/MessageHandler';
import { ApiError } from '../../types/ApiError';
import { HttpStatusCode } from '../../types/common';

// Mock dependencies
jest.mock('../../services/AudioBookService');
jest.mock('../../utils/ResponseHandler');
jest.mock('../../utils/MessageHandler');
jest.mock('../../middleware/UploadMiddleware', () => ({
   getFileUrl: jest.fn((path: string) => `https://example.com${path}`)
}));

describe('AudioBookController', () => {
   let audioBookController: AudioBookController;
   let mockPrisma: PrismaClient;
   let mockReq: any;
   let mockRes: any;
   let mockAudioBookService: jest.Mocked<AudioBookService>;

   beforeEach(() => {
      mockPrisma = {} as PrismaClient;
      mockReq = {
         params: {},
         query: {},
         body: {},
         files: undefined,
         file: undefined,
         originalUrl: '/api/v1/audiobooks',
      } as any;
      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis(),
         send: jest.fn().mockReturnThis(),
      } as any;

      mockReq.next = jest.fn();
      jest.clearAllMocks();

      audioBookController = new AudioBookController(mockPrisma);
      mockAudioBookService = (audioBookController as any).audioBookService;
   });

   describe('getAllAudioBooks', () => {
      it('should retrieve all audiobooks with default pagination', async () => {
         const mockAudiobooks = [
            { id: 'book-1', title: 'Test Book 1' },
            { id: 'book-2', title: 'Test Book 2' },
         ];

         mockAudioBookService.getAllAudioBooks.mockResolvedValue({
            audiobooks: mockAudiobooks as any,
            totalCount: 2
         });
         (ResponseHandler.calculatePagination as jest.Mock).mockReturnValue({
            currentPage: 1,
            totalPages: 1,
            totalItems: 2,
            itemsPerPage: 10,
            hasNextPage: false,
            hasPreviousPage: false,
         });
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Audiobooks retrieved');

         await audioBookController.getAllAudioBooks(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.getAllAudioBooks).toHaveBeenCalledWith(
            expect.objectContaining({
               page: 1,
               limit: 10,
               sortBy: 'createdAt',
               sortOrder: 'desc',
            })
         );
         expect(ResponseHandler.paginated).toHaveBeenCalled();
      });

      it('should parse complex query parameters', async () => {
         mockReq.query = {
            page: '2',
            limit: '20',
            sortBy: 'title',
            sortOrder: 'asc',
            genreId: 'genre-123',
            language: 'English',
            author: 'Test Author',
            narrator: 'Test Narrator',
            isActive: 'true',
            isPublic: 'false',
            search: 'test query'
         };

         mockAudioBookService.getAllAudioBooks.mockResolvedValue({
            audiobooks: [],
            totalCount: 0
         });
         (ResponseHandler.calculatePagination as jest.Mock).mockReturnValue({});
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Retrieved');

         await audioBookController.getAllAudioBooks(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.getAllAudioBooks).toHaveBeenCalledWith(
            expect.objectContaining({
               page: 2,
               limit: 20,
               sortBy: 'title',
               sortOrder: 'asc',
               genreId: 'genre-123',
               language: 'English',
               author: 'Test Author',
               narrator: 'Test Narrator',
               isActive: true,
               isPublic: false,
               search: 'test query',
            })
         );
      });

      it('should handle boolean conversion for isActive and isPublic', async () => {
         mockReq.query = { isActive: 'true', isPublic: 'false' };

         mockAudioBookService.getAllAudioBooks.mockResolvedValue({
            audiobooks: [],
            totalCount: 0
         });
         (ResponseHandler.calculatePagination as jest.Mock).mockReturnValue({});
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Retrieved');

         await audioBookController.getAllAudioBooks(mockReq, mockRes, mockReq.next);

         const callArgs = mockAudioBookService.getAllAudioBooks.mock.calls[0]?.[0];
         expect(callArgs?.isActive).toBe(true);
         expect(callArgs?.isPublic).toBe(false);
      });
   });

   describe('getAudioBookById', () => {
      it('should retrieve audiobook by ID', async () => {
         mockReq.params.id = 'book-123';
         const mockBook = { id: 'book-123', title: 'Test Book' };

         mockAudioBookService.getAudioBookById.mockResolvedValue(mockBook as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Retrieved');

         await audioBookController.getAudioBookById(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.getAudioBookById).toHaveBeenCalledWith('book-123');
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockBook,
            'Retrieved'
         );
      });
   });

   describe('createAudioBook', () => {
      it('should create audiobook without file upload', async () => {
         mockReq.body = {
            title: 'New Book',
            author: 'Author Name',
            genre: 'Fiction'
         };

         const mockBook = { id: 'book-new', title: 'New Book' };
         mockAudioBookService.createAudioBook.mockResolvedValue(mockBook as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Created');

         await audioBookController.createAudioBook(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.createAudioBook).toHaveBeenCalledWith(mockReq.body);
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockBook,
            'Created',
            HttpStatusCode.CREATED
         );
      });

      it('should handle file upload for cover image', async () => {
         mockReq.body = { title: 'Book with Cover' };
         mockReq.files = {
            coverImage: [{
               fieldname: 'coverImage',
               filename: 'cover.jpg',
               path: '/uploads/covers/cover.jpg'
            }]
         };

         const mockBook = { id: 'book-new', title: 'Book with Cover' };
         mockAudioBookService.createAudioBook.mockResolvedValue(mockBook as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Created');

         await audioBookController.createAudioBook(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.createAudioBook).toHaveBeenCalled();
         const callArgs = mockAudioBookService.createAudioBook.mock.calls[0]?.[0];
         expect(callArgs?.coverImage).toBeDefined();
      });
   });

   describe('deleteAudioBook', () => {
      it('should delete audiobook and return no content', async () => {
         mockReq.params.id = 'book-123';
         mockAudioBookService.deleteAudioBook.mockResolvedValue(undefined);

         await audioBookController.deleteAudioBook(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.deleteAudioBook).toHaveBeenCalledWith('book-123');
         expect(ResponseHandler.noContent).toHaveBeenCalledWith(mockRes);
      });
   });

   describe('searchAudioBooks', () => {
      it('should search audiobooks with query', async () => {
         mockReq.query = { q: 'test search' };

         mockAudioBookService.getAllAudioBooks.mockResolvedValue({
            audiobooks: [],
            totalCount: 0
         });
         (ResponseHandler.calculatePagination as jest.Mock).mockReturnValue({});
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Search results');

         await audioBookController.searchAudioBooks(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.getAllAudioBooks).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'test search' })
         );
      });

      it('should return validation error if query is empty', async () => {
         mockReq.query = { q: '' };
         (MessageHandler.getErrorMessage as jest.Mock).mockReturnValue('Search required');

         await audioBookController.searchAudioBooks(mockReq, mockRes, mockReq.next);

         expect(ResponseHandler.validationError).toHaveBeenCalledWith(
            mockRes,
            'Search required'
         );
         expect(mockAudioBookService.getAllAudioBooks).not.toHaveBeenCalled();
      });
   });

   describe('getAudioBooksByGenre', () => {
      it('should filter audiobooks by genre', async () => {
         mockReq.params.genre = 'genre-123';
         mockReq.query = { page: '1', limit: '10' };

         mockAudioBookService.getAllAudioBooks.mockResolvedValue({
            audiobooks: [],
            totalCount: 0
         });
         (ResponseHandler.calculatePagination as jest.Mock).mockReturnValue({});
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Filtered');

         await audioBookController.getAudioBooksByGenre(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.getAllAudioBooks).toHaveBeenCalledWith(
            expect.objectContaining({ genreId: 'genre-123' })
         );
      });
   });

   describe('getAudioBooksByAuthor', () => {
      it('should filter audiobooks by author', async () => {
         mockReq.params.author = 'Author%20Name';
         mockReq.query = { page: '1', limit: '10' };

         mockAudioBookService.getAllAudioBooks.mockResolvedValue({
            audiobooks: [],
            totalCount: 0
         });
         (ResponseHandler.calculatePagination as jest.Mock).mockReturnValue({});
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Filtered');

         await audioBookController.getAudioBooksByAuthor(mockReq, mockRes, mockReq.next);

         expect(mockAudioBookService.getAllAudioBooks).toHaveBeenCalledWith(
            expect.objectContaining({ author: 'Author Name' })
         );
      });
   });

   describe('error handling', () => {
      it('should propagate service errors', async () => {
         mockReq.params.id = 'book-123';
         const error = new ApiError('Book not found', HttpStatusCode.NOT_FOUND);
         mockAudioBookService.getAudioBookById.mockRejectedValue(error);

         try {
            await audioBookController.getAudioBookById(mockReq, mockRes, mockReq.next);
         } catch (e) {
            expect(e).toEqual(error);
         }
      });
   });
});

