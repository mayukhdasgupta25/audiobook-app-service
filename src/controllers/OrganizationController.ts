/**
 * Organization Controller
 * Handles HTTP requests and responses for organization-related operations.
 * Auth is required for all routes; the requesting user's UserProfile is
 * resolved from the authenticated JWT payload (req.user.id -> userProfile.userId).
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OrganizationService } from '../services/OrganizationService';
import { ResponseHandler } from '../utils/ResponseHandler';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { ApiError } from '../types/ApiError';
import { HttpStatusCode, ErrorType } from '../types/common';
import { AuthenticatedRequest } from '../types/auth';
import {
   CreateOrganizationDto,
   UpdateOrganizationDto,
   AddOrganizationMemberDto,
   UpdateOrganizationMemberDto,
} from '../models/OrganizationDto';

export class OrganizationController {
   private organizationService: OrganizationService;
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
      this.organizationService = new OrganizationService(prisma);
   }

   /**
    * Resolve the authenticated user's UserProfile.id from the JWT-attached
    * authentication userId. The JWT carries the auth-service's user id
    * (UserProfile.userId), so we look up the corresponding UserProfile row.
    */
   private async resolveUserProfileId(req: Request): Promise<string> {
      const authUserId = (req as AuthenticatedRequest).user?.id;
      if (!authUserId) {
         throw new ApiError(
            MessageHandler.getErrorMessage('unauthorized.not_authenticated'),
            HttpStatusCode.UNAUTHORIZED,
            ErrorType.UNAUTHORIZED
         );
      }
      const profile = await this.prisma.userProfile.findUnique({
         where: { userId: authUserId },
         select: { id: true },
      });
      if (!profile) {
         throw new ApiError(
            MessageHandler.getErrorMessage('user.profile_not_found'),
            HttpStatusCode.NOT_FOUND,
            ErrorType.NOT_FOUND
         );
      }
      return profile.id;
   }

   /**
    * @swagger
    * /api/v1/organizations:
    *   post:
    *     summary: Create a new organization
    *     description: Creates an organization and adds the requester as its OWNER.
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [name, slug]
    *             properties:
    *               name:
    *                 type: string
    *                 example: "Acme Audio"
    *               slug:
    *                 type: string
    *                 example: "acme-audio"
    *               description:
    *                 type: string
    *     responses:
    *       201:
    *         description: Organization created successfully
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       409:
    *         description: Slug already in use
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   createOrganization = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const dto: CreateOrganizationDto = req.body;
         const created = await this.organizationService.createOrganization(
            userProfileId,
            dto
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
    *     security:
    *       - bearerAuth: []
    *     responses:
    *       200:
    *         description: Organizations retrieved successfully
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getMyOrganizations = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const organizations =
            await this.organizationService.getOrganizationsForUser(userProfileId);
         ResponseHandler.success(
            res,
            organizations,
            MessageHandler.getSuccessMessage('organizations.retrieved')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}:
    *   get:
    *     summary: Get an organization by ID
    *     tags: [Organizations]
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
    *         description: Organization retrieved successfully
    *       403:
    *         $ref: '#/components/responses/Forbidden'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    */
   getOrganizationById = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const { id } = req.params as { id: string };
         const organization = await this.organizationService.getOrganizationById(
            id,
            userProfileId
         );
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
    *     tags: [Organizations]
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
    *               slug:
    *                 type: string
    *               description:
    *                 type: string
    *     responses:
    *       200:
    *         description: Organization updated successfully
    */
   updateOrganization = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const { id } = req.params as { id: string };
         const dto: UpdateOrganizationDto = req.body;
         const updated = await this.organizationService.updateOrganization(
            id,
            userProfileId,
            dto
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
    *     summary: Delete an organization (OWNER only)
    *     tags: [Organizations]
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
    *         description: Organization deleted successfully
    */
   deleteOrganization = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const { id } = req.params as { id: string };
         await this.organizationService.deleteOrganization(id, userProfileId);
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
    *     summary: List all members of an organization
    *     tags: [Organizations]
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
    *         description: Members retrieved successfully
    */
   getMembers = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const { id } = req.params as { id: string };
         const members = await this.organizationService.getMembers(id, userProfileId);
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
    *     summary: Add a member to the organization (OWNER/ADMIN only)
    *     tags: [Organizations]
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
    *             required: [userProfileId]
    *             properties:
    *               userProfileId:
    *                 type: string
    *               role:
    *                 type: string
    *                 enum: [OWNER, ADMIN, MEMBER]
    *     responses:
    *       201:
    *         description: Member added successfully
    */
   addMember = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const { id } = req.params as { id: string };
         const dto: AddOrganizationMemberDto = req.body;
         const member = await this.organizationService.addMember(
            id,
            userProfileId,
            dto
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
    *   patch:
    *     summary: Update a member's role (OWNER only)
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *       - name: userProfileId
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
    *             required: [role]
    *             properties:
    *               role:
    *                 type: string
    *                 enum: [OWNER, ADMIN, MEMBER]
    *     responses:
    *       200:
    *         description: Member role updated successfully
    */
   updateMemberRole = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const { id, userProfileId: targetUserProfileId } = req.params as {
            id: string;
            userProfileId: string;
         };
         const { role } = req.body as UpdateOrganizationMemberDto;
         const member = await this.organizationService.updateMemberRole(
            id,
            userProfileId,
            targetUserProfileId,
            role
         );
         ResponseHandler.success(
            res,
            member,
            MessageHandler.getSuccessMessage('organizations.member_updated')
         );
      }
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members/{userProfileId}:
    *   delete:
    *     summary: Remove a member from the organization
    *     description: OWNER/ADMIN may remove other members; any member may
    *       remove themselves. The OWNER cannot be removed without first
    *       transferring ownership to another member.
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: id
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *       - name: userProfileId
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *     responses:
    *       200:
    *         description: Member removed successfully
    */
   removeMember = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const { id, userProfileId: targetUserProfileId } = req.params as {
            id: string;
            userProfileId: string;
         };
         await this.organizationService.removeMember(
            id,
            userProfileId,
            targetUserProfileId
         );
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
    *     summary: List all audiobooks belonging to an organization
    *     tags: [Organizations]
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
    *         description: Audiobooks retrieved successfully
    */
   getOrganizationAudioBooks = ErrorHandler.asyncHandler(
      async (req: Request, res: Response): Promise<void> => {
         const userProfileId = await this.resolveUserProfileId(req);
         const { id } = req.params as { id: string };
         const audiobooks =
            await this.organizationService.getOrganizationAudioBooks(
               id,
               userProfileId
            );
         ResponseHandler.success(
            res,
            audiobooks,
            MessageHandler.getSuccessMessage('organizations.audiobooks_retrieved')
         );
      }
   );
}
