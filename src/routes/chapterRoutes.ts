/**
 * Chapter Routes
 * Handles chapter management, progress tracking, and navigation
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ChapterController } from '../controllers/ChapterController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';
import { UploadMiddleware } from '../middleware/UploadMiddleware';

export function createChapterRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const chapterController = new ChapterController(prisma);

   // Get chapters by audiobook ID
   router.get(
      '/audiobooks/:audiobookId/chapters',
      ValidationMiddleware.validateId,
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      chapterController.getChaptersByAudiobookId
   );

   // Get chapters with progress for an audiobook
   router.get(
      '/audiobooks/:audiobookId/chapters/with-progress',
      ValidationMiddleware.validateId,
      chapterController.getChaptersWithProgress
   );

   // Get chapter by ID
   router.get(
      '/chapters/:id',
      ValidationMiddleware.validateId,
      chapterController.getChapterById
   );

   // Create new chapter
   router.post(
      '/chapters',
      UploadMiddleware.handleAudioUpload,
      ValidationMiddleware.validateChapterCreation,
      chapterController.createChapter
   );

   // Update chapter
   router.put(
      '/chapters/:id',
      ValidationMiddleware.validateId,
      chapterController.updateChapter
   );

   // Delete chapter
   router.delete(
      '/chapters/:id',
      ValidationMiddleware.validateId,
      chapterController.deleteChapter
   );

   // Get chapter progress
   router.get(
      '/chapters/:id/progress',
      ValidationMiddleware.validateId,
      chapterController.getChapterProgress
   );

   // Update chapter progress
   router.put(
      '/chapters/:id/progress',
      ValidationMiddleware.validateId,
      chapterController.updateChapterProgress
   );

   // Get chapter with progress
   router.get(
      '/chapters/:id/with-progress',
      ValidationMiddleware.validateId,
      chapterController.getChapterWithProgress
   );

   // Get chapter navigation (previous/next)
   router.get(
      '/chapters/:id/navigation',
      ValidationMiddleware.validateId,
      chapterController.getChapterNavigation
   );

   return router;
}
