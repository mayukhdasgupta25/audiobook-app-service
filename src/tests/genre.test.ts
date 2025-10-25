/**
 * Genre Controller Tests
 * Tests for genre-related functionality
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GenreController } from '../controllers/GenreController';
import { GenreService } from '../services/GenreService';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
   PrismaClient: jest.fn().mockImplementation(() => ({
      genre: {
         findMany: jest.fn(),
         findUnique: jest.fn(),
         findFirst: jest.fn(),
      },
   })),
}));

// Mock ResponseHandler
jest.mock('../utils/ResponseHandler', () => ({
   ResponseHandler: {
      success: jest.fn(),
   },
}));

// Mock MessageHandler
jest.mock('../utils/MessageHandler', () => ({
   MessageHandler: {
      getSuccessMessage: jest.fn().mockReturnValue('Genres retrieved successfully'),
   },
}));

describe('GenreController', () => {
   let genreController: GenreController;
   let mockPrisma: PrismaClient;
   let mockReq: Partial<Request>;
   let mockRes: Partial<Response>;
   let mockNext: jest.Mock;

   beforeEach(() => {
      mockPrisma = new PrismaClient();
      genreController = new GenreController(mockPrisma);

      mockReq = {};
      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
   });

   afterEach(() => {
      jest.clearAllMocks();
   });

   describe('getAllGenres', () => {
      it('should retrieve all genres successfully', async () => {
         const mockGenres = [
            {
               id: '1',
               name: 'Fiction',
               createdAt: new Date(),
               updatedAt: new Date(),
            },
            {
               id: '2',
               name: 'Non-Fiction',
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         ];

         // Mock the service method
         jest.spyOn(GenreService.prototype, 'getAllGenres').mockResolvedValue(mockGenres as any);

         await genreController.getAllGenres(mockReq as Request, mockRes as Response, mockNext);

         expect(GenreService.prototype.getAllGenres).toHaveBeenCalledTimes(1);
      });
   });
});
