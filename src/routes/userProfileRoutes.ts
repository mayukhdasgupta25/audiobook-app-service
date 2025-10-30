/**
 * User Profile Routes
 * Handles endpoints for the current user's profile
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserProfileController } from '../controllers/UserProfileController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createUserProfileRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const userProfileController = new UserProfileController(prisma);

   // Update current user's profile
   router.put(
      '/auth/profile',
      ValidationMiddleware.validateUserProfileUpdate,
      userProfileController.updateProfile
   );

   return router;
}


