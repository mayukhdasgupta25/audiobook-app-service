/**
 * Offline Download Routes
 * Handles offline download management, queue status, and download operations
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { OfflineDownloadController } from '../controllers/OfflineDownloadController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createOfflineDownloadRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const offlineDownloadController = new OfflineDownloadController(prisma);

   // Request offline download
   router.post(
      '/downloads',
      offlineDownloadController.requestDownload
   );

   // Get user's downloads
   router.get(
      '/downloads',
      offlineDownloadController.getUserDownloads
   );

   // Get download progress
   router.get(
      '/downloads/:id/progress',
      ValidationMiddleware.validateId,
      offlineDownloadController.getDownloadProgress
   );

   // Cancel download
   router.post(
      '/downloads/:id/cancel',
      ValidationMiddleware.validateId,
      offlineDownloadController.cancelDownload
   );

   // Retry download
   router.post(
      '/downloads/:id/retry',
      ValidationMiddleware.validateId,
      offlineDownloadController.retryDownload
   );

   // Delete download
   router.delete(
      '/downloads/:id',
      ValidationMiddleware.validateId,
      offlineDownloadController.deleteDownload
   );

   // Admin routes for offline downloads
   router.get(
      '/downloads/queue/status',
      offlineDownloadController.getQueueStatus
   );

   router.get(
      '/downloads/stats',
      offlineDownloadController.getDownloadStats
   );

   // Update offline availability for audiobook
   router.put(
      '/audiobooks/:audiobookId/offline-availability',
      ValidationMiddleware.validateId,
      offlineDownloadController.updateOfflineAvailability
   );

   return router;
}
