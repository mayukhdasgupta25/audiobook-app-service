import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { ResponseHandler } from '../utils/ResponseHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { UserProfileService } from '../services/UserProfileService';
import { UpdateUserProfileDto } from '../models/UserDto';

export class UserProfileController {
   private userProfileService: UserProfileService

   constructor(prisma: PrismaClient) {
      this.userProfileService = new UserProfileService(prisma);
   }

   /**
    * @swagger
    * /api/v1/auth/profile:
    *   put:
    *     summary: Update current user's profile
    *     description: Update the authenticated user's profile information
    *     tags: [Auth]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/UpdateUserProfileRequest'
    *           examples:
    *             example1:
    *               summary: Update profile
    *               value:
    *                 username: "newusername"
    *                 firstName: "Jane"
    *                 lastName: "Smith"
    *                 avatar: "https://example.com/avatar.jpg"
    *                 preferences:
    *                   theme: "dark"
    *                   language: "en"
    *     responses:
    *       200:
    *         description: Profile updated successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/UserProfile'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   updateProfile = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user.id;
      const updateData: UpdateUserProfileDto = req.body;

      const updated = await this.userProfileService.updateUserProfile(userId, updateData);

      ResponseHandler.success(res, updated, MessageHandler.getSuccessMessage('auth.profile_updated'));
   });
}


