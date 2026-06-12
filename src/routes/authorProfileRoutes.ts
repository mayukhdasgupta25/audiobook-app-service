import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthorProfileController } from '../controllers/AuthorProfileController';
import { requireAuthor } from '../middleware/RoleMiddleware';
import { UploadMiddleware } from '../middleware/UploadMiddleware';

export function createAuthorProfileRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new AuthorProfileController(prisma);

   router.get('/me', requireAuthor(), controller.getMyProfile);
   router.put(
      '/me',
      requireAuthor(),
      UploadMiddleware.handleOptionalProfileImageUpload,
      controller.updateMyProfile,
   );
   router.delete('/me', requireAuthor(), controller.deleteMyProfile);

   return router;
}
