/**
 * Favorite Routes
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { FavoriteController } from '../controllers/FavoriteController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createFavoriteRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new FavoriteController(prisma);

   router.post('/', ValidationMiddleware.validateCreateFavorite, controller.createFavorite);
   router.get(
      '/',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      controller.getFavorites
   );
   router.get('/:id', ValidationMiddleware.validateId, controller.getFavoriteById);
   router.delete('/:id', ValidationMiddleware.validateId, controller.deleteFavorite);

   return router;
}
