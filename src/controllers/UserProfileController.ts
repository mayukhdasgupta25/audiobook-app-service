import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { ResponseHandler } from '../utils/ResponseHandler';
import { MessageHandler } from '../utils/MessageHandler';
import { UserProfileService } from '../services/UserProfileService';
import { LocationResolverService } from '../services/LocationResolverService';
import { UpdateUserProfileDto } from '../models/UserDto';
import { fileUrlService } from '../services/FileUrlService';

export class UserProfileController {
   private userProfileService: UserProfileService;
   private locationResolver: LocationResolverService;

   constructor(prisma: PrismaClient, locationResolver?: LocationResolverService) {
      this.userProfileService = new UserProfileService(prisma);
      this.locationResolver = locationResolver ?? new LocationResolverService();
   }

   /**
    * @swagger
    * /api/v1/user/profile:
    *   get:
    *     summary: Get current user's profile
    *     description: Retrieve the authenticated user's profile information
    *     tags: [Auth]
    *     responses:
    *       200:
    *         description: Profile retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/UserProfile'
    *       401:
    *         $ref: '#/components/responses/Unauthorized'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getProfile = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user.id;
      const profile = await this.userProfileService.getUserProfile(userId);
      ResponseHandler.success(res, profile, MessageHandler.getSuccessMessage('auth.profile_retrieved'));
   });

   /**
    * @swagger
    * /api/v1/user/profile:
    *   put:
    *     summary: Update current user's profile
    *     description: Update the authenticated user's profile information
    *     tags: [Auth]
    *     requestBody:
    *       required: true
    *       content:
    *         multipart/form-data:
    *           schema:
    *             type: object
    *             properties:
    *               username:
    *                 type: string
    *               firstName:
    *                 type: string
    *               lastName:
    *                 type: string
    *               avatar:
    *                 type: string
    *                 format: binary
    *               preferences:
    *                 type: object
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
    *                 location:
    *                   latitude: "13.0595592"
    *                   longitude: "77.5962203"
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
      const { location, ...profileFields } = req.body as UpdateUserProfileDto;
      const updateData: Parameters<UserProfileService['updateUserProfile']>[1] = { ...profileFields };

      const avatarFile = (req as Request & { avatarFile?: Express.Multer.File }).avatarFile;
      if (avatarFile) {
         updateData.avatar = await fileUrlService.processUploadedImageFile(
            avatarFile.path,
            'uploads/images/users',
            avatarFile.mimetype,
            'avatar',
         );
      }

      if (location !== undefined) {
         if (location === null) {
            updateData.location = null;
         } else {
            updateData.location = await this.locationResolver.resolveFromCoordinates(
               Number(location.latitude),
               Number(location.longitude)
            );
         }
      }

      const updated = await this.userProfileService.updateUserProfile(userId, updateData);

      ResponseHandler.success(res, updated, MessageHandler.getSuccessMessage('auth.profile_updated'));
   });
}


