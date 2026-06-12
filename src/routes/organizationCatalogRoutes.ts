import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AudioBookController } from '../controllers/AudioBookController';
import { requireAuthenticated } from '../middleware/RoleMiddleware';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createOrganizationCatalogRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new AudioBookController(prisma);

   router.get(
      '/:organizationId/audiobooks',
      requireAuthenticated(),
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      controller.listOrganizationAudioBooks,
   );

   return router;
}
