/**
 * Genre Controller
 * Handles HTTP requests and responses for genre operations following MVC pattern
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GenreService } from '../services/GenreService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';

export class GenreController {
   private genreService: GenreService;

   constructor(prisma: PrismaClient) {
      this.genreService = new GenreService(prisma);
   }

   /**
    * @swagger
    * /api/v1/genres:
    *   get:
    *     summary: Get all available genres
    *     description: Retrieve a list of all available genres in the system
    *     tags: [Genres]
    *     responses:
    *       200:
    *         description: Genres retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       type: array
    *                       items:
    *                         $ref: '#/components/schemas/Genre'
    *             examples:
    *               success:
    *                 summary: Successful response
    *                 value:
    *                   success: true
    *                   message: "Genres retrieved successfully"
    *                   data:
    *                     - id: "123e4567-e89b-12d3-a456-426614174000"
    *                       name: "Fiction"
    *                       createdAt: "2024-01-15T10:30:00Z"
    *                       updatedAt: "2024-01-15T10:30:00Z"
    *                     - id: "123e4567-e89b-12d3-a456-426614174001"
    *                       name: "Non-Fiction"
    *                       createdAt: "2024-01-15T10:30:00Z"
    *                       updatedAt: "2024-01-15T10:30:00Z"
    *                     - id: "123e4567-e89b-12d3-a456-426614174002"
    *                       name: "Mystery"
    *                       createdAt: "2024-01-15T10:30:00Z"
    *                       updatedAt: "2024-01-15T10:30:00Z"
    *                   timestamp: "2024-01-15T10:30:00Z"
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getAllGenres = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const genres = await this.genreService.getAllGenres();

      ResponseHandler.success(res, genres, MessageHandler.getSuccessMessage('genres.retrieved'));
   });
}
