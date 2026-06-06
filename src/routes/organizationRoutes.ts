/**
 * Organization Routes
 *
 * Mounts CRUD + member endpoints for the Organization feature.
 *
 * Access summary (see controller for details; most admin routes require org membership):
 *  - GET   /                          -> list orgs the caller belongs to (any user)
 *  - GET   /all                       -> list all organizations (not membership-scoped)
 *  - POST  /                          -> create org (any authenticated user)
 *  - GET   /:id                       -> any member of the org
 *  - PUT   /:id                       -> OWNER/ADMIN of the org (or global ADMIN)
 *  - DELETE /:id                      -> OWNER of the org (or global ADMIN)
 *  - GET   /:id/members               -> any member
 *  - POST  /:id/members               -> OWNER/ADMIN (or any user if org has no members)
 *  - PUT   /:id/members/:userId       -> OWNER/ADMIN
 *  - DELETE /:id/members/:userId      -> OWNER/ADMIN
 *  - GET   /:id/audiobooks            -> any authenticated user (publisher catalog)
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { OrganizationController } from '../controllers/OrganizationController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createOrganizationRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new OrganizationController(prisma);

   router.get('/', controller.listMyOrganizations);
   router.get(
      '/all',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      controller.listAllOrganizations
   );
   router.post('/', controller.createOrganization);

   router.get('/:id', controller.getOrganizationById);
   router.put('/:id', controller.updateOrganization);
   router.delete('/:id', controller.deleteOrganization);

   router.get('/:id/members', controller.listMembers);
   router.post('/:id/members', controller.addMember);
   router.put('/:id/members/:userProfileId', controller.updateMemberRole);
   router.delete('/:id/members/:userProfileId', controller.removeMember);

   router.get('/:id/audiobooks', controller.listOrganizationAudioBooks);

   return router;
}
