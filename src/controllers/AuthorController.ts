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
import { fileUrlService } from '../services/FileUrlService';
import { AuthenticatedRequest } from '../types/auth';
import { isGlobalAdminRole } from '../constants/authRoles';

function assertAuthorSelfOrAdmin(
   req: Request,
   res: Response,
   authorUserId: string,
): boolean {
   const authReq = req as AuthenticatedRequest;
   if (isGlobalAdminRole(authReq.user?.role)) {
      return true;
   }
   if (authReq.user?.id === authorUserId) {
      return true;
   }
   ResponseHandler.forbidden(
      res,
      MessageHandler.getErrorMessage('forbidden.admin_required'),
   );
   return false;
}

function parseFormDataStringArray(value: unknown): string[] | undefined {
   if (value === undefined || value === null || value === '') {
      return undefined;
   }
   if (Array.isArray(value)) {
      return value as string[];
   }
   if (typeof value === 'string') {
      try {
         const parsed = JSON.parse(value);
         if (Array.isArray(parsed)) {
            return parsed;
         }
         return value.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
      } catch {
         return value.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
      }
   }
   return undefined;
}

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

      if (!assertAuthorSelfOrAdmin(req, res, author.userId)) {
         return;
      }

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
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             required:
    *               - userId
    *               - firstName
    *               - lastName
    *             properties:
    *               userId:
    *                 type: string
    *                 example: "auth-user-uuid"
    *               firstName:
    *                 type: string
    *                 example: "John"
    *               lastName:
    *                 type: string
    *                 example: "Doe"
    *               address:
    *                 type: string
    *                 example: "123 Main St, City, Country"
    *               contact:
    *                 type: string
    *                 example: "+1234567890"
    *               profileImage:
    *                 type: string
    *                 format: binary
    *                 description: Optional profile image (max 50MB)
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
    *         description: Author with this user ID already exists
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   createAuthor = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const authReq = req as AuthenticatedRequest;
      const targetUserId = req.body?.userId as string | undefined;

      if (
         !isGlobalAdminRole(authReq.user?.role) &&
         (!targetUserId || targetUserId !== authReq.user?.id)
      ) {
         ResponseHandler.forbidden(
            res,
            MessageHandler.getErrorMessage('forbidden.admin_required'),
         );
         return;
      }

      const uploadedProfileImage = (req as any).profileImageFile as Express.Multer.File | undefined;

      const profileImage = uploadedProfileImage
         ? await fileUrlService.processUploadedImageFile(
            uploadedProfileImage.path,
            'uploads/images/authors',
            uploadedProfileImage.mimetype || 'image/jpeg'
         )
         : undefined;

      const createAuthorDto: CreateAuthorDto = {
         ...req.body,
         profileImage,
         organizationIds: parseFormDataStringArray(req.body.organizationIds),
      };

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
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             properties:
    *               firstName:
    *                 type: string
    *                 example: "Jane"
    *               lastName:
    *                 type: string
    *                 example: "Smith"
    *               address:
    *                 type: string
    *                 example: "456 Oak Ave, City, Country"
    *               contact:
    *                 type: string
    *                 example: "+0987654321"
    *               profileImage:
    *                 type: string
    *                 format: binary
    *                 description: Optional profile image (max 50MB)
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
    *         description: Author with this user ID already exists
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   updateAuthor = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params as { id: string };
      const existing = await this.authorService.getAuthorById(id);

      if (!assertAuthorSelfOrAdmin(req, res, existing.userId)) {
         return;
      }

      const uploadedProfileImage = (req as any).profileImageFile as Express.Multer.File | undefined;

      const updateAuthorDto: UpdateAuthorDto = {
         ...req.body,
         organizationIds: parseFormDataStringArray(req.body.organizationIds),
      };

      if (uploadedProfileImage) {
         updateAuthorDto.profileImage = await fileUrlService.processUploadedImageFile(
            uploadedProfileImage.path,
            'uploads/images/authors',
            uploadedProfileImage.mimetype || 'image/jpeg'
         );
      }

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
      const existing = await this.authorService.getAuthorById(id);

      if (!assertAuthorSelfOrAdmin(req, res, existing.userId)) {
         return;
      }

      await this.authorService.deleteAuthor(id);
      ResponseHandler.success(res, null, MessageHandler.getSuccessMessage('authors.deleted'));
   });
}

