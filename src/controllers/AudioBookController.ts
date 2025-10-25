/**
 * AudioBook Controller
 * Handles HTTP requests and responses following MVC pattern
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AudioBookService } from '../services/AudioBookService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { AudioBookQueryParams } from '../models/AudioBookDto';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { getFileUrl } from '../middleware/UploadMiddleware';

export class AudioBookController {
  private audioBookService: AudioBookService;

  constructor(prisma: PrismaClient) {
    this.audioBookService = new AudioBookService(prisma);
  }

  /**
   * @swagger
   * /api/v1/audiobooks:
   *   get:
   *     summary: Get all audiobooks with pagination and filtering
   *     description: Retrieve a paginated list of audiobooks with optional filtering by genre, language, author, narrator, and search terms
   *     tags: [AudioBooks]
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
   *       - $ref: '#/components/parameters/SearchParam'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/PaginatedSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  getAllAudioBooks = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const queryParams: AudioBookQueryParams = {
      page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
      sortBy: req.query['sortBy'] as string || 'createdAt',
      sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc',
      genreId: req.query['genreId'] as string,
      language: req.query['language'] as string,
      author: req.query['author'] as string,
      narrator: req.query['narrator'] as string,
      isActive: req.query['isActive'] !== undefined ? req.query['isActive'] === 'true' : undefined,
      isPublic: req.query['isPublic'] !== undefined ? req.query['isPublic'] === 'true' : undefined,
      search: req.query['search'] as string
    };

    const { audiobooks, totalCount } = await this.audioBookService.getAllAudioBooks(queryParams);

    const pagination = ResponseHandler.calculatePagination(
      queryParams.page!,
      queryParams.limit!,
      totalCount
    );

    ResponseHandler.paginated(res, audiobooks, pagination, MessageHandler.getSuccessMessage('audiobooks.retrieved'));
  });

  /**
   * @swagger
   * /api/v1/audiobooks/{id}:
   *   get:
   *     summary: Get audiobook by ID
   *     description: Retrieve a specific audiobook by its unique identifier
   *     tags: [AudioBooks]
   *     parameters:
   *       - $ref: '#/components/parameters/IdParam'
   *     responses:
   *       200:
   *         description: AudioBook retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               allOf:
   *                 - $ref: '#/components/schemas/ApiResponse'
   *                 - type: object
   *                   properties:
   *                     data:
   *                       $ref: '#/components/schemas/AudioBook'
   *             examples:
   *               success:
   *                 summary: Successful response
   *                 value:
   *                   success: true
   *                   message: "AudioBook retrieved successfully"
   *                   data:
   *                     id: "123e4567-e89b-12d3-a456-426614174000"
   *                     title: "The Great Gatsby"
   *                     author: "F. Scott Fitzgerald"
   *                     narrator: "Jake Gyllenhaal"
   *                     description: "A classic American novel set in the Jazz Age"
   *                     duration: 180
   *                     fileSize: 52428800
   *                     filePath: "/uploads/audiobooks/great-gatsby.mp3"
   *                     coverImage: "https://example.com/covers/great-gatsby.jpg"
   *                     genre: "Fiction"
   *                     language: "English"
   *                     publisher: "Penguin Random House"
   *                     publishDate: "1925-04-10"
   *                     isbn: "978-0-7432-7356-5"
   *                     isActive: true
   *                     isPublic: true
   *                     createdAt: "2024-01-15T10:30:00Z"
   *                     updatedAt: "2024-01-15T10:30:00Z"
   *                   timestamp: "2024-01-15T10:30:00Z"
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  getAudioBookById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const audiobook = await this.audioBookService.getAudioBookById(id as string);

    ResponseHandler.success(res, audiobook, MessageHandler.getSuccessMessage('audiobooks.retrieved_by_id'));
  });

  /**
   * @swagger
   * /api/v1/audiobooks:
   *   post:
   *     summary: Create a new audiobook
   *     description: Create a new audiobook with the provided information
   *     tags: [AudioBooks]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateAudioBookRequest'
   *           examples:
   *             example1:
   *               summary: Example audiobook
   *               value:
   *                 title: "The Great Gatsby"
   *                 author: "F. Scott Fitzgerald"
   *                 narrator: "Jake Gyllenhaal"
   *                 description: "A classic American novel set in the Jazz Age"
   *                 duration: 180
   *                 fileSize: 52428800
   *                 coverImage: "https://example.com/covers/great-gatsby.jpg"
   *                 genre: "Fiction"
   *                 language: "English"
   *                 publisher: "Penguin Random House"
   *                 publishDate: "1925-04-10"
   *                 isbn: "978-0-7432-7356-5"
   *                 isActive: true
   *                 isPublic: true
   *     responses:
   *       201:
   *         description: AudioBook created successfully
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
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  createAudioBook = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const audiobookData = req.body;

    // Handle uploaded files
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];

      // Handle cover image upload
      if (Array.isArray(files)) {
        // Single file upload
        const imageFile = files.find(file => file.fieldname === 'coverImage');
        if (imageFile) {
          audiobookData.coverImage = getFileUrl(imageFile.path);
        }
      } else {
        // Multiple file uploads
        if (files['coverImage'] && files['coverImage'].length > 0) {
          const imageFile = files['coverImage'][0];
          if (imageFile) {
            audiobookData.coverImage = getFileUrl(imageFile.path);
          }
        }
      }
    }

    const audiobook = await this.audioBookService.createAudioBook(audiobookData);

    ResponseHandler.success(res, audiobook, MessageHandler.getSuccessMessage('audiobooks.created'), 201);
  });

  /**
   * @swagger
   * /api/v1/audiobooks/{id}:
   *   put:
   *     summary: Update an existing audiobook
   *     description: Update an existing audiobook with the provided information
   *     tags: [AudioBooks]
   *     parameters:
   *       - $ref: '#/components/parameters/IdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateAudioBookRequest'
   *           examples:
   *             example1:
   *               summary: Update audiobook
   *               value:
   *                 title: "The Great Gatsby (Updated)"
   *                 description: "An updated description of the classic American novel"
   *                 isActive: false
   *     responses:
   *       200:
   *         description: AudioBook updated successfully
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
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  updateAudioBook = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updateData = req.body;

    // Handle uploaded files
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];

      // Handle cover image upload
      if (Array.isArray(files)) {
        // Single file upload
        const imageFile = files.find(file => file.fieldname === 'coverImage');
        if (imageFile) {
          updateData.coverImage = getFileUrl(imageFile.path);
        }
      } else {
        // Multiple file uploads
        if (files['coverImage'] && files['coverImage'].length > 0) {
          const imageFile = files['coverImage'][0];
          if (imageFile) {
            updateData.coverImage = getFileUrl(imageFile.path);
          }
        }
      }
    }

    const audiobook = await this.audioBookService.updateAudioBook(id as string, updateData);

    ResponseHandler.success(res, audiobook, MessageHandler.getSuccessMessage('audiobooks.updated'));
  });

  /**
   * @swagger
   * /api/v1/audiobooks/{id}:
   *   delete:
   *     summary: Delete an audiobook
   *     description: Delete an audiobook by its unique identifier
   *     tags: [AudioBooks]
   *     parameters:
   *       - $ref: '#/components/parameters/IdParam'
   *     responses:
   *       204:
   *         $ref: '#/components/responses/NoContent'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  deleteAudioBook = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await this.audioBookService.deleteAudioBook(id as string);

    ResponseHandler.noContent(res);
  });

  /**
   * @swagger
   * /api/v1/audiobooks/stats:
   *   get:
   *     summary: Get audiobook statistics
   *     description: Retrieve comprehensive statistics about audiobooks including counts, durations, genres, and languages
   *     tags: [AudioBooks]
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
   *                       $ref: '#/components/schemas/AudioBookStats'
   *             examples:
   *               success:
   *                 summary: Statistics response
   *                 value:
   *                   success: true
   *                   message: "AudioBook statistics retrieved successfully"
   *                   data:
   *                     totalAudioBooks: 150
   *                     activeAudioBooks: 145
   *                     publicAudioBooks: 120
   *                     totalDuration: 45000
   *                     averageDuration: 300
   *                     genres:
   *                       - genre: "Fiction"
   *                         count: 45
   *                       - genre: "Non-Fiction"
   *                         count: 30
   *                       - genre: "Mystery"
   *                         count: 25
   *                     languages:
   *                       - language: "English"
   *                         count: 120
   *                       - language: "Spanish"
   *                         count: 20
   *                       - language: "French"
   *                         count: 10
   *                   timestamp: "2024-01-15T10:30:00Z"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  getAudioBookStats = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.audioBookService.getAudioBookStats();

    ResponseHandler.success(res, stats, MessageHandler.getSuccessMessage('audiobooks.stats_retrieved'));
  });

  /**
   * @swagger
   * /api/v1/audiobooks/search:
   *   get:
   *     summary: Search audiobooks
   *     description: Search audiobooks by title, author, or description using a query parameter
   *     tags: [AudioBooks]
   *     parameters:
   *       - $ref: '#/components/parameters/QueryParam'
   *       - $ref: '#/components/parameters/PageParam'
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/PaginatedSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  searchAudioBooks = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || (q as string).trim().length === 0) {
      ResponseHandler.validationError(res, MessageHandler.getErrorMessage('validation.search_required'));
      return;
    }

    const queryParams: AudioBookQueryParams = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      search: q as string,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    const { audiobooks, totalCount } = await this.audioBookService.getAllAudioBooks(queryParams);

    const pagination = ResponseHandler.calculatePagination(
      queryParams.page!,
      queryParams.limit!,
      totalCount
    );

    ResponseHandler.paginated(res, audiobooks, pagination, MessageHandler.getSuccessMessage('audiobooks.search_results'));
  });

  /**
   * @swagger
   * /api/v1/audiobooks/genre/{genre}:
   *   get:
   *     summary: Get audiobooks by genre
   *     description: Retrieve audiobooks filtered by a specific genre
   *     tags: [AudioBooks]
   *     parameters:
   *       - $ref: '#/components/parameters/GenrePathParam'
   *       - $ref: '#/components/parameters/PageParam'
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/PaginatedSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  getAudioBooksByGenre = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { genre } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const queryParams: AudioBookQueryParams = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      genreId: genre as string,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    const { audiobooks, totalCount } = await this.audioBookService.getAllAudioBooks(queryParams);

    const pagination = ResponseHandler.calculatePagination(
      queryParams.page!,
      queryParams.limit!,
      totalCount
    );

    ResponseHandler.paginated(res, audiobooks, pagination, MessageHandler.getSuccessMessage('audiobooks.by_genre', { genre: genre as string }));
  });

  /**
   * @swagger
   * /api/v1/audiobooks/author/{author}:
   *   get:
   *     summary: Get audiobooks by author
   *     description: Retrieve audiobooks filtered by a specific author
   *     tags: [AudioBooks]
   *     parameters:
   *       - $ref: '#/components/parameters/AuthorPathParam'
   *       - $ref: '#/components/parameters/PageParam'
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         $ref: '#/components/responses/PaginatedSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  getAudioBooksByAuthor = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { author } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const queryParams: AudioBookQueryParams = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      author: decodeURIComponent(author as string),
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    const { audiobooks, totalCount } = await this.audioBookService.getAllAudioBooks(queryParams);

    const pagination = ResponseHandler.calculatePagination(
      queryParams.page!,
      queryParams.limit!,
      totalCount
    );

    ResponseHandler.paginated(res, audiobooks, pagination, MessageHandler.getSuccessMessage('audiobooks.by_author', { author: decodeURIComponent(author as string) }));
  });

  /**
   * @swagger
   * /api/v1/audiobooks/tags/{tags}:
   *   get:
   *     summary: Get audiobooks by tags
   *     description: Retrieve audiobooks filtered by one or more tags (comma-separated)
   *     tags: [AudioBooks]
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
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  getAudioBooksByTags = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Get parsed tags from validation middleware
    const tagList = (req as any).parsedTags;

    const queryParams: AudioBookQueryParams = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      genreId: req.query['genreId'] as string,
      language: req.query['language'] as string,
      author: req.query['author'] as string,
      narrator: req.query['narrator'] as string,
      isActive: req.query['isActive'] !== undefined ? req.query['isActive'] === 'true' : undefined,
      isPublic: req.query['isPublic'] !== undefined ? req.query['isPublic'] === 'true' : undefined,
      search: req.query['search'] as string
    };

    const { audiobooks, totalCount } = await this.audioBookService.getAudioBooksByTags(tagList, queryParams);

    const pagination = ResponseHandler.calculatePagination(
      queryParams.page!,
      queryParams.limit!,
      totalCount
    );

    ResponseHandler.paginated(res, audiobooks, pagination, MessageHandler.getSuccessMessage('audiobooks.by_tags', { tags: tagList.join(', ') }));
  });
}
