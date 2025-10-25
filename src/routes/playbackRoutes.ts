/**
 * Playback Routes
 * Handles real-time playback controls, session management, and audio streaming
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PlaybackController } from '../controllers/PlaybackController';

export function createPlaybackRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const playbackController = new PlaybackController(prisma);

   // Initialize playback session
   router.post(
      '/session',
      playbackController.initializeSession
   );

   // Sync playback state (play, pause, seek)
   router.post(
      '/sync',
      playbackController.syncPlayback
   );

   // Get playback statistics
   router.get(
      '/stats',
      playbackController.getPlaybackStats
   );

   // Cleanup inactive sessions (admin only)
   router.post(
      '/sessions/cleanup',
      playbackController.cleanupSessions
   );

   return router;
}
