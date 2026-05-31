/**
 * Mood Routes
 * Handles mood-related HTTP endpoints
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { MoodController } from '../controllers/MoodController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createMoodRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const moodController = new MoodController(prisma);

   router.get('/', moodController.getAllMoods);

   router.post(
      '/',
      ValidationMiddleware.validateCreateMood,
      moodController.createMood
   );

   router.get('/:id', ValidationMiddleware.validateId, moodController.getMoodById);

   router.put(
      '/:id',
      ValidationMiddleware.validateId,
      ValidationMiddleware.validateUpdateMood,
      moodController.updateMood
   );

   router.delete('/:id', ValidationMiddleware.validateId, moodController.deleteMood);

   return router;
}
