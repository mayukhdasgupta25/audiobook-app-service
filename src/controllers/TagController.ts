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
    *             examples:
    *               success:
    *                 summary: Successful response
    *                 value:
    *                   success: true
    *                   message: "Tags retrieved successfully"
    *                   data:
    *                     - id: "123e4567-e89b-12d3-a456-426614174000"
    *                       name: "Trending"
    *                       type: "TRENDING"
    *                       createdAt: "2024-01-15T10:30:00Z"
    *                       updatedAt: "2024-01-15T10:30:00Z"
    *                     - id: "123e4567-e89b-12d3-a456-426614174001"
    *                       name: "New Releases"
    *                       type: "NEW_RELEASES"
    *                       createdAt: "2024-01-15T10:30:00Z"
    *                       updatedAt: "2024-01-15T10:30:00Z"
    *                   timestamp: "2024-01-15T10:30:00Z"
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
}

