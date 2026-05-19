/**
 * AudioBook Controller
 * Handles HTTP requests and responses following MVC pattern
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AudioBookService } from '../services/AudioBookService';
import { BackgroundJobService } from '../services/BackgroundJobService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { AudioBookQueryParams } from '../models/AudioBookDto';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { getFileUrl } from '../middleware/UploadMiddleware';
import { OrganizationService } from '../services/OrganizationService';
import { AuthenticatedRequest } from '../types/auth';

export class AudioBookController {
  private audioBookService: AudioBookService;
  private organizationService: OrganizationService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, backgroundJobService?: BackgroundJobService) {
    this.prisma = prisma;
    this.audioBookService = new AudioBookService(prisma, backgroundJobService);
    this.organizationService = new OrganizationService(prisma);
  }

  /**
   * Resolve the list of organization IDs the authenticated user can see.
   * Global admins are not scoped (returns null = no restriction). Non-admin
   * users get the set of organizations they are a member of.
   */
  private async getAccessibleOrganizationIds(req: Request): Promise<string[] | null> {
    const authReq = req as AuthenticatedRequest;
    const role = (authReq.user?.role || '').trim().toLowerCase();
    if (role === 'admin') {
      return null;
    }
    const externalUserId = authReq.user?.id;
    if (!externalUserId) {
      return [];
    }
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: externalUserId },
      select: { id: true }
    });
    if (!profile) return [];
    return this.organizationService.getOrganizationIdsForUser(profile.id);
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
    // Parse genreIds from query (can be string or array)
    let genreIds: string[] | undefined = undefined;
    if (req.query['genreIds']) {
      if (Array.isArray(req.query['genreIds'])) {
        genreIds = req.query['genreIds'] as string[];
      } else if (typeof req.query['genreIds'] === 'string') {
        genreIds = req.query['genreIds'].split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }
    } else if (req.query['genreId']) {
      // Support legacy genreId parameter for backward compatibility
      genreIds = [req.query['genreId'] as string];
    }

    const accessibleOrgIds = await this.getAccessibleOrganizationIds(req);

    const queryParams: AudioBookQueryParams = {
      page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1,
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10,
      sortBy: req.query['sortBy'] as string || 'createdAt',
      sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc',
      genreIds: genreIds,
      organizationId: req.query['organizationId'] as string,
      language: req.query['language'] as string,
      author: req.query['author'] as string,
      narrator: req.query['narrator'] as string,
      isActive: req.query['isActive'] !== undefined ? req.query['isActive'] === 'true' : undefined,
      isPublic: req.query['isPublic'] !== undefined ? req.query['isPublic'] === 'true' : undefined,
      search: req.query['search'] as string,
      active: req.query['active'] !== undefined ? req.query['active'] === 'true' : undefined,
      scheduled: req.query['scheduled'] !== undefined ? req.query['scheduled'] === 'true' : undefined,
      ...(accessibleOrgIds !== null ? { organizationIds: accessibleOrgIds } : {})
    };

    // If the caller is scoped to a specific organization, ensure it is one
    // they have access to. Global admins bypass this check.
    if (
      accessibleOrgIds !== null &&
      queryParams.organizationId &&
      !accessibleOrgIds.includes(queryParams.organizationId)
    ) {
      ResponseHandler.forbidden(res, MessageHandler.getErrorMessage('organizations.access_denied'));
      return;
    }

    // If the user has no org memberships and is not admin, return empty list.
    if (accessibleOrgIds !== null && accessibleOrgIds.length === 0) {
      ResponseHandler.paginated(
        res,
        [],
        ResponseHandler.calculatePagination(queryParams.page!, queryParams.limit!, 0),
        MessageHandler.getSuccessMessage('audiobooks.retrieved')
      );
      return;
    }

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

    // Enforce organization-scoped access: only members of the audiobook's
    // organization (or global admins) may fetch it.
    const accessibleOrgIds = await this.getAccessibleOrganizationIds(req);
    if (accessibleOrgIds !== null && !accessibleOrgIds.includes(audiobook.organizationId)) {
      ResponseHandler.forbidden(res, MessageHandler.getErrorMessage('organizations.access_denied'));
      return;
    }

    // Enforce subscription-tier gating. This is applied even to global admins
    // because subscription-gated content is content-level, not org-level: a
    // user (admin or otherwise) without the required active subscription tier
    // should not be able to view a gated audiobook. ApiError instances thrown
    // here are routed by the global ErrorHandler middleware.
    if (audiobook.minSubscriptionTier !== null && audiobook.minSubscriptionTier !== undefined) {
      const authReq = req as AuthenticatedRequest;
      const externalUserId = authReq.user?.id;
      const profile = externalUserId
        ? await this.prisma.userProfile.findUnique({
          where: { userId: externalUserId },
          select: { id: true }
        })
        : null;

      await this.audioBookService.assertUserCanAccessBySubscription(
        audiobook.id,
        profile?.id ?? null
      );
    }

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
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             required:
    *               - title
    *               - author
    *               - genreIds
    *               - coverImage
    *             properties:
    *               title:
    *                 type: string
    *                 description: Audiobook title
    *               author:
    *                 type: string
    *                 description: Author name
    *               narrator:
    *                 type: string
    *                 description: Narrator name
    *               description:
    *                 type: string
    *                 description: Audiobook description
    *               genreIds:
    *                 type: array
    *                 items:
    *                   type: string
    *                 description: Array of Genre IDs (at least one required)
    *               language:
    *                 type: string
    *                 description: Language code
    *               publisher:
    *                 type: string
    *                 description: Publisher name
    *               publishDate:
    *                 type: string
    *                 format: date
    *                 description: Publication date
    *               isbn:
    *                 type: string
    *                 description: ISBN number
    *               isActive:
    *                 type: boolean
    *                 description: Whether the audiobook is active
    *               isPublic:
    *                 type: boolean
    *                 description: Whether the audiobook is public
    *               coverImage:
    *                 type: string
    *                 format: binary
    *                 description: Cover image (required, max 50MB)
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
    // Get cover image from upload middleware (audio file not required for audiobook creation)
    const uploadedCoverImage = (req as any).coverImageFile as Express.Multer.File | undefined;

    // Cover image is already validated by middleware, but double-check for safety
    if (!uploadedCoverImage) {
      ResponseHandler.validationError(res, 'Cover image is required');
      return;
    }

    // organizationId is required (every audiobook belongs to an organization)
    const organizationId = req.body.organizationId as string | undefined;
    if (!organizationId || organizationId.trim().length === 0) {
      ResponseHandler.validationError(
        res,
        MessageHandler.getErrorMessage('validation.organization_id_required')
      );
      return;
    }

    // Non-admin users may only create audiobooks in organizations they
    // are an OWNER or ADMIN of. Global admins bypass this check.
    const authReq = req as AuthenticatedRequest;
    const role = (authReq.user?.role || '').trim().toLowerCase();
    if (role !== 'admin') {
      const externalUserId = authReq.user?.id;
      const profile = externalUserId
        ? await this.prisma.userProfile.findUnique({
          where: { userId: externalUserId },
          select: { id: true }
        })
        : null;
      const allowed = profile
        ? await this.organizationService.isAdmin(organizationId, profile.id)
        : false;
      if (!allowed) {
        ResponseHandler.forbidden(
          res,
          MessageHandler.getErrorMessage('organizations.admin_required')
        );
        return;
      }
    }

    // Parse tagIds from form-data (can be string, array, or JSON string)
    let tagIds: string[] | undefined = undefined;
    if (req.body.tagIds) {
      if (Array.isArray(req.body.tagIds)) {
        tagIds = req.body.tagIds;
      } else if (typeof req.body.tagIds === 'string') {
        // Try to parse as JSON first (handles JSON string arrays like "[\"id1\",\"id2\"]")
        try {
          const parsed = JSON.parse(req.body.tagIds);
          if (Array.isArray(parsed)) {
            tagIds = parsed;
          } else {
            // If not JSON array, treat as comma-separated string
            tagIds = req.body.tagIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
          }
        } catch {
          // If JSON parse fails, treat as comma-separated string
          tagIds = req.body.tagIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
        }
      }
    }

    // Parse genreIds from form-data (can be string, array, or JSON string)
    let genreIds: string[] | undefined = undefined;
    if (req.body.genreIds) {
      if (Array.isArray(req.body.genreIds)) {
        genreIds = req.body.genreIds;
      } else if (typeof req.body.genreIds === 'string') {
        // Try to parse as JSON first (handles JSON string arrays like "[\"id1\",\"id2\"]")
        try {
          const parsed = JSON.parse(req.body.genreIds);
          if (Array.isArray(parsed)) {
            genreIds = parsed;
          } else {
            // If not JSON array, treat as comma-separated string
            genreIds = req.body.genreIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
          }
        } catch {
          // If JSON parse fails, treat as comma-separated string
          genreIds = req.body.genreIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
        }
      }
    }

    const audiobookData: any = {
      ...req.body,
      // Parse scheduledAt if provided (can be ISO string or Date)
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
      // Cover image from uploaded file
      coverImage: getFileUrl(uploadedCoverImage.path),
      // Include tagIds and genreIds in the data object (service expects them as part of data)
      tagIds: tagIds,
      genreIds: genreIds
    };

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

    // Extract tagIds before creating updateData
    // Handle both array and string formats (form-data might send as string)
    let tagIds: string[] | undefined = undefined;
    if (req.body.tagIds) {
      if (Array.isArray(req.body.tagIds)) {
        tagIds = req.body.tagIds;
      } else if (typeof req.body.tagIds === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(req.body.tagIds);
          if (Array.isArray(parsed)) {
            tagIds = parsed;
          } else {
            // If not JSON array, treat as comma-separated string
            tagIds = req.body.tagIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
          }
        } catch {
          // If JSON parse fails, treat as comma-separated string
          tagIds = req.body.tagIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
        }
      } else {
        tagIds = [req.body.tagIds];
      }
    }

    // Extract genreIds before creating updateData
    // Handle both array and string formats (form-data might send as string)
    let genreIds: string[] | undefined = undefined;
    if (req.body.genreIds) {
      if (Array.isArray(req.body.genreIds)) {
        genreIds = req.body.genreIds;
      } else if (typeof req.body.genreIds === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(req.body.genreIds);
          if (Array.isArray(parsed)) {
            genreIds = parsed;
          } else {
            // If not JSON array, treat as comma-separated string
            genreIds = req.body.genreIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
          }
        } catch {
          // If JSON parse fails, treat as comma-separated string
          genreIds = req.body.genreIds.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
        }
      } else {
        genreIds = [req.body.genreIds];
      }
    }

    const updateData = {
      ...req.body,
      // Parse scheduledAt if provided (can be ISO string or Date)
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined
    };

    // Remove tagIds and genreIds from updateData as they will be handled separately
    delete updateData.tagIds;
    delete updateData.genreIds;
    delete updateData.audiobookId;

    // Handle uploaded file - use req.file (singular) for single file upload
    // The middleware uploadSingleImage populates req.file, not req.files
    if (req.file) {
      updateData.coverImage = getFileUrl(req.file.path);
    }

    const audiobook = await this.audioBookService.updateAudioBook(id as string, updateData, tagIds, genreIds);

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
      genreIds: genre ? [genre as string] : undefined,
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

    // Parse genreIds from query (can be string or array)
    let genreIds: string[] | undefined = undefined;
    if (req.query['genreIds']) {
      if (Array.isArray(req.query['genreIds'])) {
        genreIds = req.query['genreIds'] as string[];
      } else if (typeof req.query['genreIds'] === 'string') {
        genreIds = req.query['genreIds'].split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }
    } else if (req.query['genreId']) {
      // Support legacy genreId parameter for backward compatibility
      genreIds = [req.query['genreId'] as string];
    }

    const queryParams: AudioBookQueryParams = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      genreIds: genreIds,
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
