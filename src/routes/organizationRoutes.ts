/**
 * Organization Routes
 * Handles organization-related HTTP endpoints including organization
 * CRUD, member management, and listing audiobooks per organization.
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { OrganizationController } from '../controllers/OrganizationController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createOrganizationRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const organizationController = new OrganizationController(prisma);

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
    */
   router.get('/', organizationController.getMyOrganizations);

   /**
    * @swagger
    * /api/v1/organizations:
    *   post:
    *     summary: Create a new organization
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
    *               slug:
    *                 type: string
    *               description:
    *                 type: string
    *     responses:
    *       201:
    *         description: Organization created successfully
    */
   router.post(
      '/',
      ValidationMiddleware.validateCreateOrganization,
      organizationController.createOrganization
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}:
    *   get:
    *     summary: Get an organization by ID
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    */
   router.get(
      '/:id',
      ValidationMiddleware.validateId,
      organizationController.getOrganizationById
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}:
    *   put:
    *     summary: Update an organization
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    */
   router.put(
      '/:id',
      ValidationMiddleware.validateId,
      ValidationMiddleware.validateUpdateOrganization,
      organizationController.updateOrganization
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}:
    *   delete:
    *     summary: Delete an organization (OWNER only)
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    */
   router.delete(
      '/:id',
      ValidationMiddleware.validateId,
      organizationController.deleteOrganization
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members:
    *   get:
    *     summary: List members of an organization
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    */
   router.get(
      '/:id/members',
      ValidationMiddleware.validateId,
      organizationController.getMembers
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members:
    *   post:
    *     summary: Add a member (OWNER/ADMIN only)
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    */
   router.post(
      '/:id/members',
      ValidationMiddleware.validateId,
      ValidationMiddleware.validateAddOrganizationMember,
      organizationController.addMember
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members/{userProfileId}:
    *   patch:
    *     summary: Update a member's role (OWNER only)
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    */
   router.patch(
      '/:id/members/:userProfileId',
      ValidationMiddleware.validateId,
      ValidationMiddleware.validateUpdateOrganizationMember,
      organizationController.updateMemberRole
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/members/{userProfileId}:
    *   delete:
    *     summary: Remove a member from the organization
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    */
   router.delete(
      '/:id/members/:userProfileId',
      ValidationMiddleware.validateId,
      organizationController.removeMember
   );

   /**
    * @swagger
    * /api/v1/organizations/{id}/audiobooks:
    *   get:
    *     summary: List audiobooks belonging to an organization
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    */
   router.get(
      '/:id/audiobooks',
      ValidationMiddleware.validateId,
      organizationController.getOrganizationAudioBooks
   );

   return router;
}
