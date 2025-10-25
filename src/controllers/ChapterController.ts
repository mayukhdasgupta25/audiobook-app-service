/**
 * Chapter Controller
 * Handles HTTP requests and responses for chapter management
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ChapterService } from '../services/ChapterService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ChapterQueryParams } from '../models/ChapterDto';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';

export class ChapterController {
   private chapterService: ChapterService;

   constructor(prisma: PrismaClient) {
      this.chapterService = new ChapterService(prisma);
   }

   /**
    * @swagger
    * /api/v1/audiobooks/{audiobookId}/chapters:
    *   get:
    *     summary: Get all chapters for an audiobook
    *     description: Retrieve all chapters for a specific audiobook with optional pagination and sorting
    *     tags: [Chapters]
    *     parameters:
    *       - name: audiobookId
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Audiobook ID
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *       - name: sortBy
    *         in: query
    *         schema:
    *           type: string
    *           enum: [chapterNumber, title, duration, createdAt]
    *           default: chapterNumber
    *         description: Field to sort by
    *       - name: sortOrder
    *         in: query
    *         schema:
    *           type: string
    *           enum: [asc, desc]
    *           default: asc
    *         description: Sort order
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getChaptersByAudiobookId = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { audiobookId } = req.params;
      const queryParams: ChapterQueryParams = {
         audiobookId: audiobookId!,
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50,
         sortBy: req.query['sortBy'] as string || 'chapterNumber',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'asc',
      };

      const { chapters, totalCount } = await this.chapterService.getChaptersByAudiobookId(audiobookId!, queryParams);

      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );

      ResponseHandler.paginated(res, chapters, pagination, MessageHandler.getSuccessMessage('chapters.retrieved'));
   });

   /**
    * @swagger
    * /api/v1/chapters/{id}:
    *   get:
    *     summary: Get chapter by ID
    *     description: Retrieve a specific chapter by its unique identifier
    *     tags: [Chapters]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Chapter ID
    *     responses:
    *       200:
    *         description: Chapter retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/Chapter'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getChapterById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const chapter = await this.chapterService.getChapterById(id as string);

      ResponseHandler.success(res, chapter, MessageHandler.getSuccessMessage('chapters.retrieved_by_id'));
   });

   /**
    * @swagger
    * /api/v1/chapters:
    *   post:
    *     summary: Create a new chapter
    *     description: Create a new chapter for an audiobook with optional audio file upload
    *     tags: [Chapters]
    *     requestBody:
    *       required: true
    *       content:
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             required:
    *               - audiobookId
    *               - title
    *               - chapterNumber
    *               - duration
    *               - startPosition
    *               - endPosition
    *             properties:
    *               audiobookId:
    *                 type: string
    *                 description: Audiobook ID
    *               title:
    *                 type: string
    *                 description: Chapter title
    *               description:
    *                 type: string
    *                 description: Chapter description
    *               chapterNumber:
    *                 type: integer
    *                 description: Chapter number
    *               duration:
    *                 type: integer
    *                 description: Duration in seconds
    *               startPosition:
    *                 type: integer
    *                 description: Start position in seconds
    *               endPosition:
    *                 type: integer
    *                 description: End position in seconds
    *               audio:
    *                 type: string
    *                 format: binary
    *                 description: Audio file (optional)
    *           examples:
    *             example1:
    *               summary: Example chapter with audio file
    *               value:
    *                 audiobookId: "123e4567-e89b-12d3-a456-426614174000"
    *                 title: "Chapter 1: The Beginning"
    *                 description: "The story begins with our protagonist"
    *                 chapterNumber: 1
    *                 duration: 1800
    *                 startPosition: 0
    *                 endPosition: 1800
    *                 audio: "[audio file]"
    *     responses:
    *       201:
    *         description: Chapter created successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/Chapter'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   createChapter = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const uploadedFile = req.file as Express.Multer.File | undefined;

      // Parse form-data values (they come as strings from multipart/form-data)
      const chapterData = {
         audiobookId: req.body.audiobookId,
         title: req.body.title,
         description: req.body.description || undefined,
         chapterNumber: parseInt(req.body.chapterNumber, 10),
         duration: parseInt(req.body.duration, 10),
         startPosition: parseInt(req.body.startPosition, 10),
         endPosition: parseInt(req.body.endPosition, 10),
         // File data will be handled by uploadedFile
         filePath: uploadedFile?.path || req.body.filePath || '',
         fileSize: uploadedFile?.size || parseInt(req.body.fileSize || '0', 10)
      };

      const chapter = await this.chapterService.createChapter(chapterData, uploadedFile);

      ResponseHandler.success(res, chapter, MessageHandler.getSuccessMessage('chapters.created'), 201);
   });

   /**
    * @swagger
    * /api/v1/chapters/{id}:
    *   put:
    *     summary: Update an existing chapter
    *     description: Update an existing chapter with the provided information
    *     tags: [Chapters]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Chapter ID
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/UpdateChapterRequest'
    *           examples:
    *             example1:
    *               summary: Update chapter
    *               value:
    *                 title: "Chapter 1: The Beginning (Updated)"
    *                 description: "An updated description of the first chapter"
    *                 duration: 1900
    *     responses:
    *       200:
    *         description: Chapter updated successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/Chapter'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   updateChapter = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const updateData = req.body;

      const chapter = await this.chapterService.updateChapter(id as string, updateData);

      ResponseHandler.success(res, chapter, MessageHandler.getSuccessMessage('chapters.updated'));
   });

   /**
    * @swagger
    * /api/v1/chapters/{id}:
    *   delete:
    *     summary: Delete a chapter
    *     description: Delete a chapter by its unique identifier
    *     tags: [Chapters]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Chapter ID
    *     responses:
    *       204:
    *         $ref: '#/components/responses/NoContent'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   deleteChapter = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      await this.chapterService.deleteChapter(id as string);

      ResponseHandler.noContent(res);
   });

   /**
    * @swagger
    * /api/v1/chapters/{id}/progress:
    *   get:
    *     summary: Get chapter progress for user
    *     description: Retrieve the current progress for a specific chapter for the authenticated user
    *     tags: [Chapters]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Chapter ID
    *     responses:
    *       200:
    *         description: Chapter progress retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/ChapterProgress'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getChapterProgress = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const progress = await this.chapterService.getChapterProgress(userId, id as string);

      ResponseHandler.success(res, progress, MessageHandler.getSuccessMessage('chapters.progress_retrieved'));
   });

   /**
    * @swagger
    * /api/v1/chapters/{id}/progress:
    *   put:
    *     summary: Update chapter progress for user
    *     description: Update the current progress for a specific chapter for the authenticated user
    *     tags: [Chapters]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Chapter ID
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/UpdateChapterProgressRequest'
    *           examples:
    *             example1:
    *               summary: Update progress
    *               value:
    *                 currentPosition: 300
    *                 completed: false
    *     responses:
    *       200:
    *         description: Chapter progress updated successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/ChapterProgress'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   updateChapterProgress = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware
      const progressData = req.body;

      const progress = await this.chapterService.updateChapterProgress(userId, id as string, progressData);

      ResponseHandler.success(res, progress, MessageHandler.getSuccessMessage('chapters.progress_updated'));
   });

   /**
    * @swagger
    * /api/v1/chapters/{id}/with-progress:
    *   get:
    *     summary: Get chapter with user progress
    *     description: Retrieve a chapter along with the current progress for the authenticated user
    *     tags: [Chapters]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Chapter ID
    *     responses:
    *       200:
    *         description: Chapter with progress retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/ChapterWithProgress'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getChapterWithProgress = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const chapterWithProgress = await this.chapterService.getChapterWithProgress(userId, id as string);

      ResponseHandler.success(res, chapterWithProgress, MessageHandler.getSuccessMessage('chapters.with_progress_retrieved'));
   });

   /**
    * @swagger
    * /api/v1/chapters/{id}/navigation:
    *   get:
    *     summary: Get chapter navigation
    *     description: Retrieve chapter navigation information including previous and next chapters
    *     tags: [Chapters]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Chapter ID
    *     responses:
    *       200:
    *         description: Chapter navigation retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/ChapterNavigation'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getChapterNavigation = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const navigation = await this.chapterService.getChapterNavigation(userId, id as string);

      ResponseHandler.success(res, navigation, MessageHandler.getSuccessMessage('chapters.navigation_retrieved'));
   });

   /**
    * @swagger
    * /api/v1/audiobooks/{audiobookId}/chapters/with-progress:
    *   get:
    *     summary: Get all chapters with progress for an audiobook
    *     description: Retrieve all chapters for an audiobook along with the current progress for the authenticated user
    *     tags: [Chapters]
    *     parameters:
    *       - name: audiobookId
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *         description: Audiobook ID
    *     responses:
    *       200:
    *         description: Chapters with progress retrieved successfully
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
    *                         $ref: '#/components/schemas/ChapterWithProgress'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getChaptersWithProgress = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { audiobookId } = req.params;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const chaptersWithProgress = await this.chapterService.getChaptersWithProgress(userId, audiobookId!);

      ResponseHandler.success(res, chaptersWithProgress, MessageHandler.getSuccessMessage('chapters.with_progress_retrieved'));
   });
}
