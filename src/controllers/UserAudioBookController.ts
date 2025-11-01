/**
 * UserAudioBook Controller
 * Handles HTTP requests and responses for user-audiobook relationships following MVC pattern
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserAudioBookService } from '../services/UserAudioBookService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { UserAudioBookQueryParams, CreateUserAudioBookDto, UpdateUserAudioBookDto } from '../models/UserAudioBookDto';

export class UserAudioBookController {
   private userAudioBookService: UserAudioBookService;

   constructor(prisma: PrismaClient) {
      this.userAudioBookService = new UserAudioBookService(prisma);
   }

   /**
    * @swagger
    * /api/v1/user-audiobooks:
    *   post:
    *     summary: Create a new user-audiobook relationship
    *     tags: [UserAudioBooks]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [userProfileId, audiobookId]
    *             properties:
    *               userProfileId:
    *                 type: string
    *               audiobookId:
    *                 type: string
    *               type:
    *                 type: string
    *                 enum: [OWNED, UPLOADED, PURCHASED]
    *     responses:
    *       201:
    *         description: User-audiobook relationship created successfully
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       409:
    *         $ref: '#/components/responses/Conflict'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   createUserAudioBook = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const data: CreateUserAudioBookDto = req.body;
      const created = await this.userAudioBookService.createUserAudioBook(data);
      ResponseHandler.success(res, created, MessageHandler.getSuccessMessage('user_audiobooks.created'), 201);
   });

   /**
    * @swagger
    * /api/v1/user-audiobooks:
    *   get:
    *     summary: Get all user-audiobook relationships
    *     description: Retrieve a paginated list of user-audiobook relationships with optional filtering
    *     tags: [UserAudioBooks]
    *     parameters:
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *       - $ref: '#/components/parameters/SortByParam'
    *       - $ref: '#/components/parameters/SortOrderParam'
    *       - name: userProfileId
    *         in: query
    *         schema:
    *           type: string
    *       - name: audiobookId
    *         in: query
    *         schema:
    *           type: string
    *       - name: type
    *         in: query
    *         schema:
    *           type: string
    *           enum: [OWNED, UPLOADED, PURCHASED]
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getAllUserAudioBooks = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const queryParams: UserAudioBookQueryParams = {
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
         sortBy: req.query['sortBy'] as string || 'createdAt',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc',
         userProfileId: req.query['userProfileId'] as string,
         audiobookId: req.query['audiobookId'] as string,
         type: req.query['type'] as any
      };

      const { userAudioBooks, totalCount } = await this.userAudioBookService.getAllUserAudioBooks(queryParams);

      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );

      ResponseHandler.paginated(
         res,
         userAudioBooks,
         pagination,
         MessageHandler.getSuccessMessage('user_audiobooks.retrieved')
      );
   });

   /**
    * @swagger
    * /api/v1/user-audiobooks/{id}:
    *   get:
    *     summary: Get user-audiobook relationship by ID
    *     tags: [UserAudioBooks]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: User-audiobook relationship retrieved successfully
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getUserAudioBookById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const userAudioBook = await this.userAudioBookService.getUserAudioBookById(id as string);
      ResponseHandler.success(res, userAudioBook, MessageHandler.getSuccessMessage('user_audiobooks.retrieved_by_id'));
   });

   /**
    * @swagger
    * /api/v1/user-audiobooks/{id}:
    *   put:
    *     summary: Update user-audiobook relationship
    *     description: Update the type of a user-audiobook relationship
    *     tags: [UserAudioBooks]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               type:
    *                 type: string
    *                 enum: [OWNED, UPLOADED, PURCHASED]
    *     responses:
    *       200:
    *         description: User-audiobook relationship updated successfully
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   updateUserAudioBook = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const updateData: UpdateUserAudioBookDto = req.body;
      const updated = await this.userAudioBookService.updateUserAudioBook(id as string, updateData);
      ResponseHandler.success(res, updated, MessageHandler.getSuccessMessage('user_audiobooks.updated'));
   });

   /**
    * @swagger
    * /api/v1/user-audiobooks/{id}:
    *   delete:
    *     summary: Delete user-audiobook relationship
    *     tags: [UserAudioBooks]
    *     parameters:
    *       - $ref: '#/components/parameters/IdParam'
    *     responses:
    *       200:
    *         description: User-audiobook relationship deleted successfully
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   deleteUserAudioBook = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      await this.userAudioBookService.deleteUserAudioBook(id as string);
      ResponseHandler.success(res, { deleted: true }, MessageHandler.getSuccessMessage('user_audiobooks.deleted'));
   });

   /**
    * @swagger
    * /api/v1/user-audiobooks/user/{userProfileId}:
    *   get:
    *     summary: Get all audiobooks for a user
    *     tags: [UserAudioBooks]
    *     parameters:
    *       - name: userProfileId
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getUserAudioBooksByUserProfileId = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { userProfileId } = req.params;
      const queryParams: UserAudioBookQueryParams = {
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
         sortBy: req.query['sortBy'] as string || 'createdAt',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc'
      };

      const { userAudioBooks, totalCount } = await this.userAudioBookService.getUserAudioBooksByUserProfileId(
         userProfileId as string,
         queryParams
      );

      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );

      ResponseHandler.paginated(
         res,
         userAudioBooks,
         pagination,
         MessageHandler.getSuccessMessage('user_audiobooks.retrieved')
      );
   });

   /**
    * @swagger
    * /api/v1/user-audiobooks/audiobook/{audiobookId}:
    *   get:
    *     summary: Get all users for an audiobook
    *     tags: [UserAudioBooks]
    *     parameters:
    *       - name: audiobookId
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getUserAudioBooksByAudiobookId = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { audiobookId } = req.params;
      const queryParams: UserAudioBookQueryParams = {
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
         sortBy: req.query['sortBy'] as string || 'createdAt',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc'
      };

      const { userAudioBooks, totalCount } = await this.userAudioBookService.getUserAudioBooksByAudiobookId(
         audiobookId as string,
         queryParams
      );

      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );

      ResponseHandler.paginated(
         res,
         userAudioBooks,
         pagination,
         MessageHandler.getSuccessMessage('user_audiobooks.retrieved')
      );
   });

   /**
    * @swagger
    * /api/v1/user-audiobooks/type/{type}:
    *   get:
    *     summary: Get all user-audiobook relationships by type
    *     tags: [UserAudioBooks]
    *     parameters:
    *       - name: type
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *           enum: [OWNED, UPLOADED, PURCHASED]
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getUserAudioBooksByType = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { type } = req.params;
      const queryParams: UserAudioBookQueryParams = {
         page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
         limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
         sortBy: req.query['sortBy'] as string || 'createdAt',
         sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc'
      };

      const { userAudioBooks, totalCount } = await this.userAudioBookService.getUserAudioBooksByType(
         type as any,
         queryParams
      );

      const pagination = ResponseHandler.calculatePagination(
         queryParams.page!,
         queryParams.limit!,
         totalCount
      );

      ResponseHandler.paginated(
         res,
         userAudioBooks,
         pagination,
         MessageHandler.getSuccessMessage('user_audiobooks.retrieved')
      );
   });
}

