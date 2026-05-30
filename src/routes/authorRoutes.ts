/**
 * Author Routes
 * Handles author-related HTTP endpoints
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthorController } from '../controllers/AuthorController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createAuthorRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const authorController = new AuthorController(prisma);

   /**
    * @swagger
    * /api/v1/authors:
    *   get:
    *     summary: Get all authors
    *     description: Retrieve a list of all authors in the system
    *     tags: [Authors]
    *     security:
    *       - bearerAuth: []
    *     responses:
    *       200:
    *         description: Authors retrieved successfully
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get('/', authorController.getAllAuthors);

   /**
    * @swagger
    * /api/v1/authors/{id}:
    *   get:
    *     summary: Get an author by ID
    *     tags: [Authors]
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
    *         description: Author retrieved successfully
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get('/:id', ValidationMiddleware.validateId, authorController.getAuthorById);

   /**
    * @swagger
    * /api/v1/authors:
    *   post:
    *     summary: Create a new author
    *     tags: [Authors]
    *     security:
    *       - bearerAuth: []
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - firstName
    *               - lastName
    *             properties:
    *               firstName:
    *                 type: string
    *               lastName:
    *                 type: string
    *               email:
    *                 type: string
    *               address:
    *                 type: string
    *               contact:
    *                 type: string
    *               organizationIds:
    *                 type: array
    *                 items:
    *                   type: string
    *                 description: Optional organization IDs to link this author to
    *     responses:
    *       201:
    *         description: Author created successfully
    *       400:
    *         $ref: '#/components/responses/BadRequest'
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       409:
    *         description: Author with this email already exists
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.post(
      '/',
      ValidationMiddleware.validateCreateAuthor,
      ValidationMiddleware.validateAuthorOrganizationIds,
      authorController.createAuthor
   );

   /**
    * @swagger
    * /api/v1/authors/{id}:
    *   put:
    *     summary: Update an author
    *     tags: [Authors]
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
    *               firstName:
    *                 type: string
    *               lastName:
    *                 type: string
    *               email:
    *                 type: string
    *               address:
    *                 type: string
    *               contact:
    *                 type: string
    *               organizationIds:
    *                 type: array
    *                 items:
    *                   type: string
    *                 description: Replace all organization links with this list (optional)
    *     responses:
    *       200:
    *         description: Author updated successfully
    *       400:
    *         $ref: '#/components/responses/BadRequest'
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       409:
    *         description: Author with this email already exists
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.put(
      '/:id',
      ValidationMiddleware.validateId,
      ValidationMiddleware.validateUpdateAuthor,
      ValidationMiddleware.validateAuthorOrganizationIds,
      authorController.updateAuthor
   );

   /**
    * @swagger
    * /api/v1/authors/{id}:
    *   delete:
    *     summary: Delete an author
    *     tags: [Authors]
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
    *         description: Author deleted successfully
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.delete('/:id', ValidationMiddleware.validateId, authorController.deleteAuthor);

   return router;
}

