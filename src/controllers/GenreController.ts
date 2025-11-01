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
    *   post:
    *     summary: Create a new genre
    *     tags: [Genres]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [name]
    *             properties:
    *               name:
    *                 type: string
    *     responses:
    *       201:
    *         description: Genre created successfully
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   createGenre = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { name } = req.body as { name: string };
      const created = await this.genreService.createGenre(name);
      ResponseHandler.success(res, created, MessageHandler.getSuccessMessage('genres.created'), 201);
   });

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

   /**
    * @swagger
    * /api/v1/genres/{id}:
    *   get:
    *     summary: Get a genre by ID
    *     tags: [Genres]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *     responses:
    *       200:
    *         description: Genre retrieved successfully
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getGenreById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const genre = await this.genreService.getGenreById(id);
      ResponseHandler.success(res, genre, MessageHandler.getSuccessMessage('genres.retrieved'));
   });

   /**
    * @swagger
    * /api/v1/genres/{id}:
    *   put:
    *     summary: Update a genre by ID
    *     tags: [Genres]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [name]
    *             properties:
    *               name:
    *                 type: string
    *     responses:
    *       200:
    *         description: Genre updated successfully
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   updateGenre = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const { name } = req.body as { name: string };
      const updated = await this.genreService.updateGenre(id, name);
      ResponseHandler.success(res, updated, MessageHandler.getSuccessMessage('genres.updated'));
   });

   /**
    * @swagger
    * /api/v1/genres/{id}:
    *   delete:
    *     summary: Delete a genre by ID
    *     tags: [Genres]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *     responses:
    *       200:
    *         description: Genre deleted successfully
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   deleteGenre = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      await this.genreService.deleteGenre(id);
      ResponseHandler.success(res, { deleted: true }, MessageHandler.getSuccessMessage('genres.deleted'));
   });
}
