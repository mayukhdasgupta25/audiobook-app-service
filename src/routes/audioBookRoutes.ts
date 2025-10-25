/**
 * AudioBook Routes
 * Handles audiobook CRUD operations, search, filtering, and statistics
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AudioBookController } from '../controllers/AudioBookController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { UploadMiddleware } from '../middleware/UploadMiddleware';

export function createAudioBookRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const audioBookController = new AudioBookController(prisma);

   /**
    * @swagger
    * /api/v1/audiobooks:
    *   get:
    *     summary: Get all audiobooks
    *     description: Retrieve a paginated list of audiobooks with optional filtering
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *       - $ref: '#/components/parameters/SortByParam'
    *       - $ref: '#/components/parameters/SortOrderParam'
    *       - $ref: '#/components/parameters/GenreParam'
    *       - $ref: '#/components/parameters/LanguageParam'
    *       - $ref: '#/components/parameters/AuthorParam'
    *       - $ref: '#/components/parameters/NarratorParam'
    *       - $ref: '#/components/parameters/IsActiveParam'
    *       - $ref: '#/components/parameters/IsPublicParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.validateAudioBookFilters,
      ValidationMiddleware.sanitizeQueryParams,
      audioBookController.getAllAudioBooks
   );

   /**
    * @swagger
    * /api/v1/audiobooks/search:
    *   get:
    *     summary: Search audiobooks
    *     description: Search audiobooks by title, author, or description
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - $ref: '#/components/parameters/QueryParam'
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/search',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      audioBookController.searchAudioBooks
   );

   /**
    * @swagger
    * /api/v1/audiobooks/stats:
    *   get:
    *     summary: Get audiobook statistics
    *     description: Get statistics about audiobooks in the system
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *     responses:
    *       200:
    *         description: Statistics retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       type: object
    *                       properties:
    *                         totalAudioBooks:
    *                           type: 'integer'
    *                           example: 150
    *                         activeAudioBooks:
    *                           type: 'integer'
    *                           example: 120
    *                         publicAudioBooks:
    *                           type: 'integer'
    *                           example: 100
    *                         totalDuration:
    *                           type: 'integer'
    *                           example: 50000
    *                         averageDuration:
    *                           type: 'integer'
    *                           example: 333
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/stats',
      audioBookController.getAudioBookStats
   );

   /**
    * @swagger
    * /api/v1/audiobooks/genre/{genre}:
    *   get:
    *     summary: Get audiobooks by genre
    *     description: Retrieve audiobooks filtered by genre
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - $ref: '#/components/parameters/GenrePathParam'
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/genre/:genre',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      audioBookController.getAudioBooksByGenre
   );

   /**
    * @swagger
    * /api/v1/audiobooks/author/{author}:
    *   get:
    *     summary: Get audiobooks by author
    *     description: Retrieve audiobooks filtered by author
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - $ref: '#/components/parameters/AuthorPathParam'
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/author/:author',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      audioBookController.getAudioBooksByAuthor
   );

   /**
    * @swagger
    * /api/v1/audiobooks/tags/{tags}:
    *   get:
    *     summary: Get audiobooks by tags
    *     description: Retrieve audiobooks filtered by one or more tags (comma-separated)
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - name: tags
    *         in: path
    *         required: true
    *         description: Comma-separated list of tag names
    *         schema:
    *           type: string
    *           example: "fiction,adventure"
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *       - $ref: '#/components/parameters/SortByParam'
    *       - $ref: '#/components/parameters/SortOrderParam'
    *       - $ref: '#/components/parameters/GenreParam'
    *       - $ref: '#/components/parameters/LanguageParam'
    *       - $ref: '#/components/parameters/AuthorParam'
    *       - $ref: '#/components/parameters/NarratorParam'
    *       - $ref: '#/components/parameters/IsActiveParam'
    *       - $ref: '#/components/parameters/IsPublicParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/tags/:tags',
      ValidationMiddleware.validateTags,
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.validateAudioBookFilters,
      ValidationMiddleware.sanitizeQueryParams,
      audioBookController.getAudioBooksByTags
   );

   /**
    * @swagger
    * /api/v1/audiobooks/{id}:
    *   get:
    *     summary: Get audiobook by ID
    *     description: Retrieve a specific audiobook by its ID
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Audiobook retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/AudioBook'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       404:
    *         $ref: '#/components/responses/NotFoundError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/:id',
      ValidationMiddleware.validateId,
      audioBookController.getAudioBookById
   );

   /**
    * @swagger
    * /api/v1/audiobooks:
    *   post:
    *     summary: Create audiobook
    *     description: Create a new audiobook
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *       - csrfToken: []
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/CreateAudioBookRequest'
    *     responses:
    *       201:
    *         description: Audiobook created successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/AudioBook'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       403:
    *         $ref: '#/components/responses/ForbiddenError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.post(
      '/',
      UploadMiddleware.handleAudioUpload,
      UploadMiddleware.handleImageUpload,
      audioBookController.createAudioBook
   );

   /**
    * @swagger
    * /api/v1/audiobooks/{id}:
    *   put:
    *     summary: Update audiobook
    *     description: Update an existing audiobook
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *       - csrfToken: []
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/UpdateAudioBookRequest'
    *     responses:
    *       200:
    *         description: Audiobook updated successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/AudioBook'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       403:
    *         $ref: '#/components/responses/ForbiddenError'
    *       404:
    *         $ref: '#/components/responses/NotFoundError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.put(
      '/:id',
      ValidationMiddleware.validateId,
      UploadMiddleware.handleAudioUpload,
      UploadMiddleware.handleImageUpload,
      audioBookController.updateAudioBook
   );

   /**
    * @swagger
    * /api/v1/audiobooks/{id}:
    *   delete:
    *     summary: Delete audiobook
    *     description: Delete an audiobook
    *     tags: [AudioBooks]
    *     security:
    *       - sessionAuth: []
    *       - csrfToken: []
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: Audiobook deleted successfully
    *         content:
    *           application/json:
    *             schema:
    *               $ref: '#/components/schemas/ApiResponse'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       403:
    *         $ref: '#/components/responses/ForbiddenError'
    *       404:
    *         $ref: '#/components/responses/NotFoundError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.delete(
      '/:id',
      ValidationMiddleware.validateId,
      audioBookController.deleteAudioBook
   );

   return router;
}
