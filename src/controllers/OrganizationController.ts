/**
 * Organization Controller
 *
 * Handles HTTP requests for organization management and membership.
 * Members are checked against the authenticated user; admin operations
 * (rename, delete, manage members) require OWNER or ADMIN role within
 * the target organization (or a global ADMIN role).
 */
import { Request, Response } from 'express';
import { PrismaClient, OrganizationRole } from '@prisma/client';
import { OrganizationService } from '../services/OrganizationService';
import { AudioBookService } from '../services/AudioBookService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { isGlobalAdminRole } from '../constants/authRoles';
import { hasOwnerTierOrgAccess } from '../services/OrganizationService';
import { ApiError } from '../types/ApiError';
import { AuthenticatedRequest } from '../types/auth';
import { AudioBookQueryParams } from '../models/AudioBookDto';
import {
   CreateOrganizationDto,
   OrganizationTeamSizeType,
   UpdateOrganizationDto,
} from '../models/OrganizationDto';
import { resolveUserProfileId } from '../utils/resolveUserProfileId';
import { fileUrlService } from '../services/FileUrlService';

function parseOptionalString(value: unknown): string | undefined {
   if (value === undefined || value === null) {
      return undefined;
   }
   if (typeof value !== 'string') {
      return undefined;
   }
   return value.trim();
}

function parseProfileFieldsFromBody(
   body: Record<string, unknown>,
   isUpdate: boolean
): Pick<CreateOrganizationDto, 'preferredGenre' | 'websiteUrl' | 'teamSize'> {
   const result: Pick<CreateOrganizationDto, 'preferredGenre' | 'websiteUrl' | 'teamSize'> = {};

   if (body['preferredGenre'] !== undefined) {
      const preferredGenre = parseOptionalString(body['preferredGenre']);
      if (isUpdate) {
         result.preferredGenre = preferredGenre && preferredGenre.length > 0
            ? preferredGenre
            : null;
      } else if (preferredGenre && preferredGenre.length > 0) {
         result.preferredGenre = preferredGenre;
      }
   }

   if (body['websiteUrl'] !== undefined) {
      const websiteUrl = parseOptionalString(body['websiteUrl']);
      if (isUpdate) {
         result.websiteUrl = websiteUrl && websiteUrl.length > 0 ? websiteUrl : null;
      } else if (websiteUrl && websiteUrl.length > 0) {
         result.websiteUrl = websiteUrl;
      }
   }

   if (body['teamSize'] !== undefined) {
      const teamSize = parseOptionalString(body['teamSize']);
      if (isUpdate) {
         result.teamSize = teamSize && teamSize.length > 0
            ? (teamSize as OrganizationTeamSizeType)
            : null;
      } else if (teamSize && teamSize.length > 0) {
         result.teamSize = teamSize as OrganizationTeamSizeType;
      }
   }

   return result;
}

/**
 * Check if the authenticated user is a global admin (e.g. role from JWT
 * is "ADMIN"). Global admins can manage any organization.
 */
function isGlobalAdmin(req: Request): boolean {
   const authReq = req as AuthenticatedRequest;
   return isGlobalAdminRole(authReq.user?.role);
}

function getBearerToken(req: Request): string | undefined {
   const authorization = req.headers.authorization;
   if (!authorization || !authorization.startsWith('Bearer ')) {
      return undefined;
   }
   const token = authorization.slice(7).trim();
   return token.length > 0 ? token : undefined;
}

export class OrganizationController {
   private prisma: PrismaClient;
   private organizationService: OrganizationService;
   private audioBookService: AudioBookService;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
      this.organizationService = new OrganizationService(prisma);
      this.audioBookService = new AudioBookService(prisma);
   }

   /**
    * Ensure the authenticated user can administer the target organization
    * (i.e. OWNER/ADMIN within the org, or a global ADMIN).
    */
   private async assertOrgAdmin(
      req: Request,
      organizationId: string
   ): Promise<void> {
      if (isGlobalAdmin(req)) return;
      const authReq = req as AuthenticatedRequest;
      const userProfileId = await resolveUserProfileId(this.prisma, req);
      const hasAccess = await this.organizationService.hasOrgStaffAccess(
         organizationId,
         userProfileId,
         authReq.user?.role,
      );
      if (!hasAccess) {
         throw ApiError.forbidden(
            MessageHandler.getErrorMessage('organizations.admin_required')
         );
      }
   }

   /**
    * Ensure the authenticated user is at least a member of the org.
    */
   private async assertOrgMember(
      req: Request,
      organizationId: string
   ): Promise<void> {
      if (isGlobalAdmin(req)) return;
      const userProfileId = await resolveUserProfileId(this.prisma, req);
      const isMember = await this.organizationService.isMember(
         organizationId,
         userProfileId
      );
      if (!isMember) {
         throw ApiError.forbidden(
            MessageHandler.getErrorMessage('organizations.access_denied')
         );
      }
   }

   /**
    * @swagger
    * /api/v1/organizations:
    *   post:
    *     summary: Create a new organization
    *     description: |
    *       Create an organization. The authenticated user is added as the
    *       OWNER of the new organization automatically.
    *     tags: [Organizations]
    *     requestBody:
    *       required: true
    *       content:
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             required: [name]
    *             properties:
    *               name: { type: string }
    *               slug: { type: string }
    *               description: { type: string }
    *               image:
    *                 type: string
    *                 format: binary
    *                 description: Optional organization image (max 50MB)
    *               preferredGenre:
    *                 type: string
    *                 description: Optional preferred genre name (0 or 1 genre)
    *               websiteUrl:
    *                 type: string
    *                 description: Optional organization website URL
    *               teamSize:
    *                 type: string
    *                 enum: ['1-10', '11-50', '51-200', '200+']
    *                 description: Optional team size bucket
    *     responses:
    *       201: { description: Organization created successfully }
    *       400: { $ref: '#/components/responses/ValidationError' }
    *       409: { description: Slug already exists }
    */
   createOrganization = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await resolveUserProfileId(this.prisma, req);
         const uploadedImage = (req as any).organizationImageFile as Express.Multer.File | undefined;

         const image = uploadedImage
            ? await fileUrlService.processUploadedImageFile(
               uploadedImage.path,
               'uploads/images/organizations',
               uploadedImage.mimetype || 'image/jpeg'
            )
            : undefined;

         const createData: CreateOrganizationDto = {
            ...req.body,
            image,
            ...parseProfileFieldsFromBody(req.body, false),
         };

         const created = await this.organizationService.createOrganization(
            createData,
            userProfileId
         );
         ResponseHandler.success(
            res,
            created,
            MessageHandler.getSuccessMessage('organizations.created'),
            201
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations:
    *   get:
    *     summary: List organizations the authenticated user belongs to
    *     tags: [Organizations]
    *     responses:
    *       200: { description: Organizations retrieved successfully }
    */
   listMyOrganizations = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await resolveUserProfileId(this.prisma, req);
         const memberships =
            await this.organizationService.getOrganizationsForUser(userProfileId);
         ResponseHandler.success(
            res,
            memberships,
            MessageHandler.getSuccessMessage('organizations.retrieved')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/all:
    *   get:
    *     summary: List all organizations
    *     description: |
    *       Returns every organization in the system. Not filtered by membership;
    *       any authenticated user may browse the full catalog.
    *     tags: [Organizations]
    *     parameters:
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *     responses:
    *       200:
    *         description: All organizations retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/PaginatedResponse'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   listAllOrganizations = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
         const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10;
         const result = await this.organizationService.listOrganizations({ page, limit });
         const pagination = ResponseHandler.calculatePagination(
            page,
            limit,
            result.totalCount
         );
         ResponseHandler.paginated(
            res,
            result.organizations,
            pagination,
            MessageHandler.getSuccessMessage('organizations.all_retrieved')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}:
    *   get:
    *     summary: Get an organization by id
    *     description: Authenticated user must be a member of the organization.
    *     tags: [Organizations]
    *     parameters:
    *       - { name: id, in: path, required: true, schema: { type: string } }
    *     responses:
    *       200: { description: Organization retrieved successfully }
    *       403: { $ref: '#/components/responses/ForbiddenError' }
    *       404: { $ref: '#/components/responses/NotFoundError' }
    */
   getOrganizationById = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { id } = req.params as { id: string };
         await this.assertOrgMember(req, id);
         const organization =
            await this.organizationService.getOrganizationById(id);
         ResponseHandler.success(
            res,
            organization,
            MessageHandler.getSuccessMessage('organizations.retrieved_by_id')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}:
    *   put:
    *     summary: Update an organization
    *     description: Requires OWNER or ADMIN role within the organization.
    *     tags: [Organizations]
    *     parameters:
    *       - { name: id, in: path, required: true, schema: { type: string } }
    *     requestBody:
    *       required: true
    *       content:
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             properties:
    *               name: { type: string }
    *               slug: { type: string }
    *               description: { type: string }
    *               image:
    *                 type: string
    *                 format: binary
    *                 description: Optional organization image (max 50MB)
    *               preferredGenre:
    *                 type: string
    *                 description: Optional preferred genre name; send empty to clear
    *               websiteUrl:
    *                 type: string
    *                 description: Optional organization website URL; send empty to clear
    *               teamSize:
    *                 type: string
    *                 enum: ['1-10', '11-50', '51-200', '200+']
    *                 description: Optional team size bucket; send empty to clear
    *     responses:
    *       200: { description: Organization updated successfully }
    *       403: { $ref: '#/components/responses/ForbiddenError' }
    *       404: { $ref: '#/components/responses/NotFoundError' }
    */
   updateOrganization = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { id } = req.params as { id: string };
         await this.assertOrgAdmin(req, id);

         const uploadedImage = (req as any).organizationImageFile as Express.Multer.File | undefined;
         const updateData: UpdateOrganizationDto = {
            ...req.body,
            ...parseProfileFieldsFromBody(req.body, true),
         };

         if (uploadedImage) {
            updateData.image = await fileUrlService.processUploadedImageFile(
               uploadedImage.path,
               'uploads/images/organizations',
               uploadedImage.mimetype || 'image/jpeg'
            );
         }

         const updated = await this.organizationService.updateOrganization(
            id,
            updateData
         );
         ResponseHandler.success(
            res,
            updated,
            MessageHandler.getSuccessMessage('organizations.updated')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}:
    *   delete:
    *     summary: Delete an organization
    *     description: |
    *       Requires OWNER role within the organization (or global ADMIN).
    *       Cascades to all members and audiobooks.
    *     tags: [Organizations]
    */
   deleteOrganization = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { id } = req.params as { id: string };

         if (!isGlobalAdmin(req)) {
            const authReq = req as AuthenticatedRequest;
            const userProfileId = await resolveUserProfileId(this.prisma, req);
            const membershipRole = await this.organizationService.getMemberRole(
               id,
               userProfileId
            );
            if (
               !hasOwnerTierOrgAccess(authReq.user?.role, membershipRole)
            ) {
               throw ApiError.forbidden(
                  MessageHandler.getErrorMessage('organizations.owner_required')
               );
            }
         }

         await this.organizationService.deleteOrganization(id);
         ResponseHandler.success(
            res,
            { deleted: true },
            MessageHandler.getSuccessMessage('organizations.deleted')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members:
    *   get:
    *     summary: List members of an organization
    *     tags: [Organizations]
    */
   listMembers = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { id } = req.params as { id: string };
         await this.assertOrgMember(req, id);
         const members = await this.organizationService.listMembers(id);
         ResponseHandler.success(
            res,
            members,
            MessageHandler.getSuccessMessage('organizations.members_retrieved')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members:
    *   post:
    *     summary: Add a member to an organization
    *     description: |
    *       Requires OWNER or ADMIN role when the organization already has members.
    *       Any authenticated user may add the first member to a memberless organization.
    *     tags: [Organizations]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [userProfileId]
    *             properties:
    *               userProfileId: { type: string }
    *               role: { type: string, enum: [OWNER, ADMIN] }
    */
   addMember = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { id } = req.params as { id: string };
         const hasMembers = await this.organizationService.hasMembers(id);
         if (hasMembers) {
            await this.assertOrgAdmin(req, id);
         }

         const { userProfileId, role } = req.body || {};
         if (!userProfileId || typeof userProfileId !== 'string') {
            ResponseHandler.validationError(
               res,
               MessageHandler.getErrorMessage('validation.user_profile_id_required')
            );
            return;
         }
         if (
            role !== undefined &&
            !Object.values(OrganizationRole).includes(role)
         ) {
            ResponseHandler.validationError(
               res,
               MessageHandler.getErrorMessage('organizations.role_invalid')
            );
            return;
         }

         const member = await this.organizationService.addMember(
            id,
            userProfileId,
            (role as OrganizationRole) || OrganizationRole.ADMIN,
            getBearerToken(req),
         );
         ResponseHandler.success(
            res,
            member,
            MessageHandler.getSuccessMessage('organizations.member_added'),
            201
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members/{userProfileId}:
    *   put:
    *     summary: Update a member's role
    *     tags: [Organizations]
    */
   updateMemberRole = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { id, userProfileId } = req.params as {
            id: string;
            userProfileId: string;
         };
         await this.assertOrgAdmin(req, id);

         const { role } = req.body || {};
         if (!role || !Object.values(OrganizationRole).includes(role)) {
            ResponseHandler.validationError(
               res,
               MessageHandler.getErrorMessage('organizations.role_invalid')
            );
            return;
         }

         const updated = await this.organizationService.updateMemberRole(
            id,
            userProfileId,
            role as OrganizationRole,
            getBearerToken(req),
         );
         ResponseHandler.success(
            res,
            updated,
            MessageHandler.getSuccessMessage('organizations.member_updated')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members/{userProfileId}:
    *   delete:
    *     summary: Remove a member from an organization
    *     tags: [Organizations]
    */
   removeMember = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { id, userProfileId } = req.params as {
            id: string;
            userProfileId: string;
         };
         await this.assertOrgAdmin(req, id);
         await this.organizationService.removeMember(id, userProfileId);
         ResponseHandler.success(
            res,
            { removed: true },
            MessageHandler.getSuccessMessage('organizations.member_removed')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/audiobooks:
    *   get:
    *     summary: List audiobooks belonging to an organization
    *     description: |
    *       Public catalog listing for that publisher. Does not require org
    *       membership; returns 404 if the organization id is unknown.
    *     tags: [Organizations]
    */
   listOrganizationAudioBooks = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const { id } = req.params as { id: string };
         // Any authenticated user may browse a publisher's catalog; confirm org exists.
         await this.organizationService.getOrganizationById(id);

         const queryParams: AudioBookQueryParams = {
            page: req.query['page']
               ? parseInt(req.query['page'] as string, 10)
               : 1,
            limit: req.query['limit']
               ? parseInt(req.query['limit'] as string, 10)
               : 10,
            sortBy: (req.query['sortBy'] as string) || 'createdAt',
            sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') || 'desc',
            search: req.query['search'] as string,
            organizationId: id,
         };

         const { audiobooks, totalCount } =
            await this.audioBookService.getAllAudioBooks(queryParams);

         const pagination = ResponseHandler.calculatePagination(
            queryParams.page!,
            queryParams.limit!,
            totalCount
         );

         ResponseHandler.paginated(
            res,
            audiobooks,
            pagination,
            MessageHandler.getSuccessMessage('organizations.audiobooks_retrieved')
         );
      }
   );
}
