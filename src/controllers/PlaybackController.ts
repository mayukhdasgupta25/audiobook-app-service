/**
 * Playback Controller
 * Handles HTTP requests and responses for audiobook playback functionality
 */
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PlaybackService } from '../services/PlaybackService';
import { ResponseHandler } from '../utils/ResponseHandler';
import {
   PlaybackSyncRequest
} from '../models/PlaybackDto';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { MessageHandler } from '../utils/MessageHandler';

export class PlaybackController {
   private playbackService: PlaybackService;

   constructor(prisma: PrismaClient) {
      this.playbackService = new PlaybackService(prisma);
   }

   /**
    * @swagger
    * /api/v1/playback/session:
    *   post:
    *     summary: Initialize playback session
    *     description: Initialize or get existing playback session for an audiobook
    *     tags: [Playback]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - audiobookId
    *             properties:
    *               audiobookId:
    *                 type: string
    *                 description: Audiobook ID
    *               chapterId:
    *                 type: string
    *                 description: Optional chapter ID to start with
    *           examples:
    *             example1:
    *               summary: Initialize session
    *               value:
    *                 audiobookId: "123e4567-e89b-12d3-a456-426614174000"
    *                 chapterId: "chapter-123"
    *     responses:
    *       200:
    *         description: Playback session initialized successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/PlaybackSession'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   initializeSession = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { audiobookId, chapterId } = req.body;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const session = await this.playbackService.initializePlaybackSession(userId, audiobookId, chapterId);

      ResponseHandler.success(res, session, MessageHandler.getSuccessMessage('playback.session_initialized'));
   });

   /**
    * @swagger
    * /api/v1/playback/sync:
    *   post:
    *     summary: Sync playback state
    *     description: Synchronize playback state (play, pause, seek) for real-time control
    *     tags: [Playback]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required:
    *               - audiobookId
    *               - action
    *             properties:
    *               audiobookId:
    *                 type: string
    *                 description: Audiobook ID
    *               action:
    *                 type: string
    *                 enum: [play, pause, seek]
    *                 description: Playback action
    *               position:
    *                 type: number
    *                 description: Position in seconds (required for seek action)
    *               chapterId:
    *                 type: string
    *                 description: Optional chapter ID for chapter-specific operations
    *           examples:
    *             play:
    *               summary: Play audiobook
    *               value:
    *                 audiobookId: "123e4567-e89b-12d3-a456-426614174000"
    *                 action: "play"
    *             pause:
    *               summary: Pause audiobook
    *               value:
    *                 audiobookId: "123e4567-e89b-12d3-a456-426614174000"
    *                 action: "pause"
    *             seek:
    *               summary: Seek to position
    *               value:
    *                 audiobookId: "123e4567-e89b-12d3-a456-426614174000"
    *                 action: "seek"
    *                 position: 300
    *                 chapterId: "chapter-123"
    *     responses:
    *       200:
    *         description: Playback sync executed successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/PlaybackState'
    *       400:
    *         $ref: '#/components/responses/ValidationError'
    *       404:
    *         $ref: '#/components/responses/NotFound'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   syncPlayback = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const syncRequest: PlaybackSyncRequest = req.body;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const playbackState = await this.playbackService.syncPlayback(userId, syncRequest);

      ResponseHandler.success(res, playbackState, MessageHandler.getSuccessMessage('playback.sync_executed'));
   });

   /**
    * @swagger
    * /api/v1/playback/stats:
    *   get:
    *     summary: Get playback statistics
    *     description: Retrieve playback statistics for the authenticated user
    *     tags: [Playback]
    *     parameters:
    *       - name: audiobookId
    *         in: query
    *         schema:
    *           type: string
    *         description: Optional audiobook ID to filter statistics
    *     responses:
    *       200:
    *         description: Playback statistics retrieved successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       $ref: '#/components/schemas/PlaybackStats'
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   getPlaybackStats = ErrorHandler.asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { audiobookId } = req.query;
      const userId = (req as any).user.id; // Assuming user is attached by auth middleware

      const stats = await this.playbackService.getPlaybackStats(userId, audiobookId as string);

      ResponseHandler.success(res, stats, MessageHandler.getSuccessMessage('playback.stats_retrieved'));
   });

   /**
    * @swagger
    * /api/v1/playback/sessions/cleanup:
    *   post:
    *     summary: Cleanup inactive sessions
    *     description: Clean up inactive playback sessions (admin endpoint)
    *     tags: [Playback]
    *     responses:
    *       200:
    *         description: Cleanup completed successfully
    *         content:
    *           application/json:
    *             schema:
    *               allOf:
    *                 - $ref: '#/components/schemas/ApiResponse'
    *                 - type: object
    *                   properties:
    *                     data:
    *                       type: object
    *                       properties:
    *                         activeSessions:
    *                           type: number
    *       500:
    *         $ref: '#/components/responses/InternalServerError'
    */
   cleanupSessions = ErrorHandler.asyncHandler(async (_req: Request, res: Response): Promise<void> => {
      this.playbackService.cleanupInactiveSessions();
      const activeSessions = this.playbackService.getActiveSessionsCount();

      ResponseHandler.success(res, { activeSessions }, MessageHandler.getSuccessMessage('playback.cleanup_completed'));
   });
}
