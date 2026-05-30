/**
 * Author Controller
 * Handles HTTP requests and responses for author operations following MVC pattern
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthorService } from '../services/AuthorService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { CreateAuthorDto, UpdateAuthorDto } from '../models/AuthorDto';

export class AuthorController {
   private authorService: AuthorService;

   constructor(prisma: PrismaClient) {
      this.authorService = new AuthorService(prisma);
   }

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
    *                         $ref: '#/components/schemas/Author'
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getAllAuthors = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      const authors = await this.authorService.getAllAuthors();
      ResponseHandler.success(res, authors, MessageHandler.getSuccessMessage('authors.retrieved'));
   });

   /**
    * @swagger
    * /api/v1/authors/{id}:
    *   get:
    *     summary: Get an author by ID
    *     description: Retrieve a specific author by its ID
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
   getAuthorById = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const author = await this.authorService.getAuthorById(id);
      ResponseHandler.success(res, author, MessageHandler.getSuccessMessage('authors.retrieved'));
   });

   /**
    * @swagger
    * /api/v1/authors:
    *   post:
    *     summary: Create a new author
    *     description: Create a new author in the system
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
    *                 example: "John"
    *               lastName:
    *                 type: string
    *                 example: "Doe"
    *               email:
    *                 type: string
    *                 format: email
    *                 example: "john.doe@example.com"
    *               address:
    *                 type: string
    *                 example: "123 Main St, City, Country"
    *               contact:
    *                 type: string
    *                 example: "+1234567890"
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
   createAuthor = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const createAuthorDto: CreateAuthorDto = req.body;
      const author = await this.authorService.createAuthor(createAuthorDto);
      ResponseHandler.success(res, author, MessageHandler.getSuccessMessage('authors.created'), 201);
   });

   /**
    * @swagger
    * /api/v1/authors/{id}:
    *   put:
    *     summary: Update an author
    *     description: Update an existing author by its ID
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
    *                 example: "Jane"
    *               lastName:
    *                 type: string
    *                 example: "Smith"
    *               email:
    *                 type: string
    *                 format: email
    *                 example: "jane.smith@example.com"
    *               address:
    *                 type: string
    *                 example: "456 Oak Ave, City, Country"
    *               contact:
    *                 type: string
    *                 example: "+0987654321"
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
   updateAuthor = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const updateAuthorDto: UpdateAuthorDto = req.body;
      const author = await this.authorService.updateAuthor(id, updateAuthorDto);
      ResponseHandler.success(res, author, MessageHandler.getSuccessMessage('authors.updated'));
   });

   /**
    * @swagger
    * /api/v1/authors/{id}:
    *   delete:
    *     summary: Delete an author
    *     description: Delete an existing author by its ID
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
   deleteAuthor = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      await this.authorService.deleteAuthor(id);
      ResponseHandler.success(res, null, MessageHandler.getSuccessMessage('authors.deleted'));
   });
}

