/**
 * PlaybackController Tests
 * Tests for playback state management and session handling
 */

import { PrismaClient } from '@prisma/client';
import { PlaybackController } from '../../controllers/PlaybackController';
import { PlaybackService } from '../../services/PlaybackService';
import { ResponseHandler } from '../../utils/ResponseHandler';
import { MessageHandler } from '../../utils/MessageHandler';
import { ApiError } from '../../types/ApiError';
import { HttpStatusCode } from '../../types/common';

// Mock dependencies
jest.mock('../../services/PlaybackService');
jest.mock('../../utils/ResponseHandler');
jest.mock('../../utils/MessageHandler');

describe('PlaybackController', () => {
   let playbackController: PlaybackController;
   let mockPrisma: PrismaClient;
   let mockReq: any;
   let mockRes: any;
   let mockPlaybackService: jest.Mocked<PlaybackService>;

   beforeEach(() => {
      mockPrisma = {} as PrismaClient;
      mockReq = {
         params: {},
         query: {},
         body: {},
         user: { id: 'user-123' },
         originalUrl: '/api/v1/playback',
      } as any;
      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis(),
         send: jest.fn().mockReturnThis(),
      } as any;

      mockReq.next = jest.fn();
      jest.clearAllMocks();

      playbackController = new PlaybackController(mockPrisma);
      mockPlaybackService = (playbackController as any).playbackService;
   });

   describe('initializeSession', () => {
      it('should initialize playback session', async () => {
         mockReq.body = {
            audiobookId: 'audiobook-123',
            chapterId: 'chapter-456'
         };

         const mockSession = {
            userId: 'user-123',
            audiobookId: 'audiobook-123',
            currentChapterId: 'chapter-456',
            position: 0
         };

         mockPlaybackService.initializePlaybackSession.mockResolvedValue(mockSession as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Session initialized');

         await playbackController.initializeSession(mockReq, mockRes, mockReq.next);

         expect(mockPlaybackService.initializePlaybackSession).toHaveBeenCalledWith(
            'user-123',
            'audiobook-123',
            'chapter-456'
         );
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockSession,
            'Session initialized'
         );
      });
   });

   describe('syncPlayback', () => {
      it('should sync playback state', async () => {
         mockReq.body = {
            audiobookId: 'audiobook-123',
            action: 'play',
            position: 300,
            chapterId: 'chapter-456'
         };

         const mockState = {
            userId: 'user-123',
            audiobookId: 'audiobook-123',
            isPlaying: true,
            position: 300
         };

         mockPlaybackService.syncPlayback.mockResolvedValue(mockState as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Sync executed');

         await playbackController.syncPlayback(mockReq, mockRes, mockReq.next);

         expect(mockPlaybackService.syncPlayback).toHaveBeenCalledWith(
            'user-123',
            mockReq.body
         );
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockState,
            'Sync executed'
         );
      });
   });

   describe('getPlaybackStats', () => {
      it('should retrieve playback statistics', async () => {
         mockReq.query = { audiobookId: 'audiobook-123' };

         const mockStats = {
            userId: 'user-123',
            audiobookId: 'audiobook-123',
            totalPlayTime: 3600,
            sessionsCount: 5
         };

         mockPlaybackService.getPlaybackStats.mockResolvedValue(mockStats as any);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Stats retrieved');

         await playbackController.getPlaybackStats(mockReq, mockRes, mockReq.next);

         expect(mockPlaybackService.getPlaybackStats).toHaveBeenCalledWith(
            'user-123',
            'audiobook-123'
         );
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            mockStats,
            'Stats retrieved'
         );
      });
   });

   describe('cleanupSessions', () => {
      it('should cleanup inactive sessions', async () => {
         mockPlaybackService.getActiveSessionsCount.mockReturnValue(5);
         (MessageHandler.getSuccessMessage as jest.Mock).mockReturnValue('Cleanup completed');

         await playbackController.cleanupSessions(mockReq, mockRes, mockReq.next);

         expect(mockPlaybackService.cleanupInactiveSessions).toHaveBeenCalled();
         expect(ResponseHandler.success).toHaveBeenCalledWith(
            mockRes,
            { activeSessions: 5 },
            'Cleanup completed'
         );
      });
   });

   describe('error handling', () => {
      it('should propagate service errors', async () => {
         const error = new ApiError('Playback error', HttpStatusCode.INTERNAL_SERVER_ERROR);
         mockPlaybackService.initializePlaybackSession.mockRejectedValue(error);

         try {
            await playbackController.initializeSession(mockReq, mockRes, mockReq.next);
         } catch (e) {
            expect(e).toEqual(error);
         }
      });
   });
});

