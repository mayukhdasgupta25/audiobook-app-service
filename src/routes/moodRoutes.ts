/**
 * Mood Routes
 * Handles mood-related HTTP endpoints
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { MoodController } from '../controllers/MoodController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { requireGlobalAdmin } from '../middleware/RoleMiddleware';

export function createMoodRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const moodController = new MoodController(prisma);

   router.get('/', moodController.getAllMoods);

   router.post(
      '/',
      requireGlobalAdmin(),
      ValidationMiddleware.validateCreateMood,
      moodController.createMood
   );

   router.get('/:id', ValidationMiddleware.validateId, moodController.getMoodById);

   router.put(
      '/:id',
      requireGlobalAdmin(),
      ValidationMiddleware.validateId,
      ValidationMiddleware.validateUpdateMood,
      moodController.updateMood
   );

   router.delete('/:id', requireGlobalAdmin(), ValidationMiddleware.validateId, moodController.deleteMood);

   return router;
}
