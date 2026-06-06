/**
 * Playlist Routes
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PlaylistController } from '../controllers/PlaylistController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createPlaylistRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new PlaylistController(prisma);

   router.post('/', ValidationMiddleware.validateCreatePlaylist, controller.createPlaylist);
   router.get(
      '/',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      controller.getPlaylists
   );
   router.get('/:id', ValidationMiddleware.validateId, controller.getPlaylistById);
   router.put('/:id', ValidationMiddleware.validateId, ValidationMiddleware.validateUpdatePlaylist, controller.updatePlaylist);
   router.delete('/:id', ValidationMiddleware.validateId, controller.deletePlaylist);

   router.post('/:id/items', ValidationMiddleware.validateId, ValidationMiddleware.validateCreatePlaylistItem, controller.addPlaylistItem);
   router.get('/:id/items', ValidationMiddleware.validateId, controller.getPlaylistItems);
   router.put('/:id/items/:itemId', ValidationMiddleware.validateId, ValidationMiddleware.validateUpdatePlaylistItem, controller.updatePlaylistItem);
   router.delete('/:id/items/:itemId', ValidationMiddleware.validateId, controller.deletePlaylistItem);

   return router;
}
