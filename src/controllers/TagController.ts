/**
 * Tag Controller
 * Handles HTTP requests and responses for tag operations following MVC pattern
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TagService } from '../services/TagService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { AuthenticatedRequest } from '../types/auth';
import { CreateTagDto, UpdateTagDto } from '../models/TagDto';
import { ApiError } from '../types/ApiError';

export class TagController {
   private tagService: TagService;

   constructor(prisma: PrismaClient) {
      this.tagService = new TagService(prisma);
   }

   /**
    * @swagger
    * /api/v1/tags:
    *   get:
    *     summary: Get all available tags
    *     description: Retrieve a list of all available tags in the system
    *     tags: [Tags]
    *     responses:
    *       200:
    *         description: Tags retrieved successfully
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
    *                         $ref: '#/components/schemas/Tag'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getAllTags = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const tags = await this.tagService.getAllTags();
      ResponseHandler.success(res, tags, MessageHandler.getSuccessMessage('tags.retrieved'));
   });

   /**
    * @swagger
    * /api/v1/tags/{id}:
    *   get:
    *     summary: Get a tag by ID
    *     description: Retrieve a specific tag by its ID
    *     tags: [Tags]
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *     responses:
    *       200:
    *         description: Tag retrieved successfully
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getTagById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const tag = await this.tagService.getTagById(id);
      ResponseHandler.success(res, tag, MessageHandler.getSuccessMessage('tags.retrieved'));
   });

   /**
    * @swagger
    * /api/v1/tags:
    *   post:
    *     summary: Create a new tag
    *     description: Create a new global tag (requires authentication)
    *     tags: [Tags]
    *     security:
    *       - bearerAuth: []
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - name
    *             properties:
    *               name:
    *                 type: string
    *                 example: "Fiction"
    *     responses:
    *       201:
    *         description: Tag created successfully
    *       400:
    *         $ref: '#/components/responses/BadRequest'
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       409:
    *         description: Tag with this name already exists
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   createTag = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
         ResponseHandler.error(res, ApiError.unauthorized(MessageHandler.getErrorMessage('auth.unauthorized')));
         return;
      }

      const createTagDto: CreateTagDto = req.body;
      const tag = await this.tagService.createTag(createTagDto);
      ResponseHandler.success(res, tag, MessageHandler.getSuccessMessage('tags.created'), 201);
   });

   /**
    * @swagger
    * /api/v1/tags/{id}:
    *   put:
    *     summary: Update a tag
    *     description: Update an existing global tag (requires authentication)
    *     tags: [Tags]
    *     security:
    *       - bearerAuth: []
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
    *             properties:
    *               name:
    *                 type: string
    *                 example: "Updated Tag Name"
    *     responses:
    *       200:
    *         description: Tag updated successfully
    *       400:
    *         $ref: '#/components/responses/BadRequest'
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       409:
    *         description: Tag with this name already exists
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   updateTag = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
         ResponseHandler.error(res, ApiError.unauthorized(MessageHandler.getErrorMessage('auth.unauthorized')));
         return;
      }

      const updateTagDto: UpdateTagDto = req.body;
      const tag = await this.tagService.updateTag(id, updateTagDto);
      ResponseHandler.success(res, tag, MessageHandler.getSuccessMessage('tags.updated'));
   });

   /**
    * @swagger
    * /api/v1/tags/{id}:
    *   delete:
    *     summary: Delete a tag
    *     description: Delete an existing global tag and all associated audiobook-tag relationships (requires authentication)
    *     tags: [Tags]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *     responses:
    *       200:
    *         description: Tag deleted successfully
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   deleteTag = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
         ResponseHandler.error(res, ApiError.unauthorized(MessageHandler.getErrorMessage('auth.unauthorized')));
         return;
      }

      await this.tagService.deleteTag(id);
      ResponseHandler.success(res, null, MessageHandler.getSuccessMessage('tags.deleted'));
   });
}

