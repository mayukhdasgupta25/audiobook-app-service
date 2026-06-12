import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthorProfileController } from '../controllers/AuthorProfileController';
import { requireAuthor } from '../middleware/RoleMiddleware';
import { UploadMiddleware } from '../middleware/UploadMiddleware';

export function createAuthorProfileRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const controller = new AuthorProfileController(prisma);

   /**
    * @swagger
    * /api/v1/author-profiles/me:
    *   get:
    *     summary: Get my author profile
    *     description: Returns app-service AuthorProfile (avatar) for the authenticated author.
    *     tags: [AuthorProfiles]
    *     security:
    *       - bearerAuth: []
    *     responses:
    *       200:
    *         description: Author profile
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/AuthorProfile'
    *             example:
    *               success: true
    *               message: "Author profile retrieved"
    *               data:
    *                 id: "cprofile1234567890abcdef"
    *                 authorId: "cauthor1234567890abcdefgh"
    *                 avatar: "https://cdn.example.com/avatar.jpg"
    *               timestamp: "2024-01-15T10:30:00Z"
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *   put:
    *     summary: Update my author profile
    *     tags: [AuthorProfiles]
    *     security:
    *       - bearerAuth: []
    *     requestBody:
    *       content:
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             properties:
    *               avatar: { type: string, format: binary }
    *     responses:
    *       200:
    *         description: Updated profile
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *   delete:
    *     summary: Delete my author profile
    *     tags: [AuthorProfiles]
    *     security:
    *       - bearerAuth: []
    *     responses:
    *       204:
    *         $ref: '#/components/responses/NoContent'
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    */
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
