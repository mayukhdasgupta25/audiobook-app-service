import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AudioBookController } from '../controllers/AudioBookController';
import { requireAuthenticated } from '../middleware/RoleMiddleware';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createOrganizationCatalogRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new AudioBookController(prisma);

   /**
    * @swagger
    * /api/v1/organizations/{organizationId}/audiobooks:
    *   get:
    *     summary: List organization audiobooks
    *     description: Paginated audiobooks owned by the organization (ownerType=ORGANIZATION, ownerId=organizationId).
    *     tags: [Organizations]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - name: organizationId
    *         in: path
    *         required: true
    *         schema: { type: string }
    *         example: "corg1234567890abcdefghij"
    *       - $ref: '#/components/parameters/PageParam'
    *       - $ref: '#/components/parameters/LimitParam'
    *       - $ref: '#/components/parameters/SortByParam'
    *       - $ref: '#/components/parameters/SortOrderParam'
    *       - name: search
    *         in: query
    *         schema: { type: string }
    *         description: Search title, author, or description
    *     responses:
    *       200:
    *         $ref: '#/components/responses/PaginatedSuccess'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   router.get(
      '/:organizationId/audiobooks',
      requireAuthenticated(),
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      controller.listOrganizationAudioBooks,
   );

   return router;
}
