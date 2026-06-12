/**
 * Tag Routes
 * Handles tag-related HTTP endpoints
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { TagController } from '../controllers/TagController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { requireGlobalAdmin } from '../middleware/RoleMiddleware';

export function createTagRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const tagController = new TagController(prisma);

   /**
    * @swagger
    * /api/v1/tags:
    *   get:
    *     summary: Get all available tags
    *     description: Retrieve a list of all available tags in the system (requires authentication)
    *     tags: [Tags]
    *     security:
    *       - bearerAuth: []
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
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get('/', tagController.getAllTags);

   /**
    * @swagger
    * /api/v1/tags/{id}:
    *   get:
    *     summary: Get a tag by ID
    *     description: Retrieve a specific tag by its ID (requires authentication)
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
    *         description: Tag retrieved successfully
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get('/:id', ValidationMiddleware.validateId, tagController.getTagById);

   /**
    * @swagger
    * /api/v1/tags:
    *   post:
    *     summary: Create a new tag
    *     description: Create a new global tag (requires GLOBAL_ADMIN role)
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
   router.post(
      '/',
      requireGlobalAdmin(),
      ValidationMiddleware.validateCreateTag,
      tagController.createTag
   );

   /**
    * @swagger
    * /api/v1/tags/{id}:
    *   put:
    *     summary: Update a tag
    *     description: Update an existing global tag (requires GLOBAL_ADMIN role)
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
   router.put(
      '/:id',
      requireGlobalAdmin(),
      ValidationMiddleware.validateId,
      ValidationMiddleware.validateUpdateTag,
      tagController.updateTag
   );

   /**
    * @swagger
    * /api/v1/tags/{id}:
    *   delete:
    *     summary: Delete a tag
    *     description: Delete an existing global tag and all associated audiobook-tag relationships (requires GLOBAL_ADMIN role)
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
   router.delete('/:id', requireGlobalAdmin(), ValidationMiddleware.validateId, tagController.deleteTag);

   return router;
}

