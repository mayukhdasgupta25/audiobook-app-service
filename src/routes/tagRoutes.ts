/**
 * Tag Routes
 * Handles tag-related HTTP endpoints
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { TagController } from '../controllers/TagController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createTagRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const tagController = new TagController(prisma);

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
   router.get('/', tagController.getAllTags);

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
   router.get('/:id', ValidationMiddleware.validateId, tagController.getTagById);

   return router;
}

