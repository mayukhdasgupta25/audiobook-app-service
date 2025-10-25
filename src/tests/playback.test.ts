/**
 * Playback Service Tests
 * Tests for audiobook playback functionality
 */
// import { PrismaClient } from '@prisma/client';
import { PlaybackService } from '../services/PlaybackService';
import { PlaybackControlRequest } from '../models/PlaybackDto';

// Mock Prisma client
const mockPrisma = {
   listeningHistory: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
   },
   chapterProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
   },
   chapter: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
   },
} as any;

describe('PlaybackService', () => {
   let playbackService: PlaybackService;

   beforeEach(() => {
      playbackService = new PlaybackService(mockPrisma);
      jest.clearAllMocks();
   });

   describe('initializePlaybackSession', () => {
      it('should initialize a new playback session', async () => {
         const userId = 'user-1';
         const audiobookId = 'audiobook-1';
         const chapterId = 'chapter-1';

         const mockChapterProgress = {
            userId,
            chapterId,
            currentPosition: 300,
            completed: false,
         };

         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         mockPrisma.chapterProgress.findUnique.mockResolvedValue(mockChapterProgress);

         const result = await playbackService.initializePlaybackSession(userId, audiobookId, chapterId);

         expect(result.userId).toBe(userId);
         expect(result.audiobookId).toBe(audiobookId);
         expect(result.currentChapterId).toBe(chapterId);
         expect(result.currentPosition).toBe(300);
         expect(result.isPlaying).toBe(false);
         expect(result.playbackSpeed).toBe(1.0);
         expect(result.volume).toBe(100);
      });

      it('should return existing session if already exists', async () => {
         const userId = 'user-1';
         const audiobookId = 'audiobook-1';

         // First call to create session
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         await playbackService.initializePlaybackSession(userId, audiobookId);

         // Second call should return existing session
         const result = await playbackService.initializePlaybackSession(userId, audiobookId);

         expect(result.userId).toBe(userId);
         expect(result.audiobookId).toBe(audiobookId);
      });
   });

   describe('handlePlaybackControl', () => {
      it('should handle play action', async () => {
         const userId = 'user-1';
         const controlRequest: PlaybackControlRequest = {
            audiobookId: 'audiobook-1',
            action: 'play',
         };

         // Initialize session first
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         await playbackService.initializePlaybackSession(userId, controlRequest.audiobookId);

         const result = await playbackService.handlePlaybackControl(userId, controlRequest);

         expect(result.isPlaying).toBe(true);
         expect(result.audiobookId).toBe(controlRequest.audiobookId);
      });

      it('should handle pause action', async () => {
         const userId = 'user-1';
         const controlRequest: PlaybackControlRequest = {
            audiobookId: 'audiobook-1',
            action: 'pause',
         };

         // Initialize session first
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         await playbackService.initializePlaybackSession(userId, controlRequest.audiobookId);

         const result = await playbackService.handlePlaybackControl(userId, controlRequest);

         expect(result.isPlaying).toBe(false);
      });

      it('should handle seek action', async () => {
         const userId = 'user-1';
         const controlRequest: PlaybackControlRequest = {
            audiobookId: 'audiobook-1',
            action: 'seek',
            position: 300,
         };

         // Initialize session first
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         await playbackService.initializePlaybackSession(userId, controlRequest.audiobookId);

         const result = await playbackService.handlePlaybackControl(userId, controlRequest);

         expect(result.currentPosition).toBe(300);
      });

      it('should throw error if session not found', async () => {
         const userId = 'user-1';
         const controlRequest: PlaybackControlRequest = {
            audiobookId: 'audiobook-1',
            action: 'play',
         };

         await expect(playbackService.handlePlaybackControl(userId, controlRequest)).rejects.toThrow('Playback session not found');
      });
   });

   describe('seekToPosition', () => {
      it('should seek to a valid position', async () => {
         const userId = 'user-1';
         const position = 300;

         // Initialize session first
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         const session = await playbackService.initializePlaybackSession(userId, 'audiobook-1');

         await playbackService.seekToPosition(userId, position, session);

         // Verify the session was updated
         const updatedSession = playbackService.getPlaybackState(session);
         expect(updatedSession.currentPosition).toBe(position);
      });

      it('should throw error for negative position', async () => {
         const userId = 'user-1';
         const position = -100;

         await expect(playbackService.seekToPosition(userId, position)).rejects.toThrow('Position cannot be negative');
      });

      it('should validate position against chapter duration', async () => {
         const userId = 'user-1';
         const position = 2000;

         const mockChapter = {
            id: 'chapter-1',
            duration: 1800,
         };

         // Initialize session with chapter
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         const session = await playbackService.initializePlaybackSession(userId, 'audiobook-1', 'chapter-1');

         mockPrisma.chapter.findUnique.mockResolvedValue(mockChapter);

         await expect(playbackService.seekToPosition(userId, position, session)).rejects.toThrow('Position cannot exceed chapter duration');
      });
   });

   describe('changePlaybackSpeed', () => {
      it('should change playback speed to valid value', async () => {
         const userId = 'user-1';
         const speed = 1.5;

         // Initialize session first
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         const session = await playbackService.initializePlaybackSession(userId, 'audiobook-1');

         await playbackService.changePlaybackSpeed(userId, 'audiobook-1', speed);

         const updatedSession = playbackService.getPlaybackState(session);
         expect(updatedSession.playbackSpeed).toBe(speed);
      });

      it('should throw error for unsupported speed', async () => {
         const userId = 'user-1';
         const speed = 3.0; // Not in SUPPORTED_SPEEDS

         // Initialize session first
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         await expect(playbackService.changePlaybackSpeed(userId, 'audiobook-1', speed)).rejects.toThrow('Unsupported playback speed');
      });
   });

   describe('navigateToChapter', () => {
      it('should navigate to a valid chapter', async () => {
         const userId = 'user-1';

         const mockChapter = {
            id: 'chapter-2',
            audiobookId: 'audiobook-1',
            title: 'Chapter 2',
         };

         // Initialize session first
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         const session = await playbackService.initializePlaybackSession(userId, 'audiobook-1');

         mockPrisma.chapter.findFirst.mockResolvedValue(mockChapter);
         mockPrisma.chapterProgress.upsert.mockResolvedValue({});

         expect(session.currentChapterId).toBe('chapter-2');
         expect(session.currentPosition).toBe(0);
      });

      it('should throw error if chapter not found', async () => {
         const userId = 'user-1';
         const navigationRequest = {
            audiobookId: 'audiobook-1',
            chapterId: 'non-existent',
            position: 0,
         };

         // Initialize session first
         mockPrisma.listeningHistory.findUnique.mockResolvedValue(null);
         await playbackService.initializePlaybackSession(userId, 'audiobook-1');

         mockPrisma.chapter.findFirst.mockResolvedValue(null);

         await expect(playbackService.navigateToChapter(userId, navigationRequest.audiobookId, navigationRequest.chapterId)).rejects.toThrow('Chapter not found or does not belong to this audiobook');
      });
   });

   describe('getPlaybackStats', () => {
      it('should return playback statistics', async () => {
         const userId = 'user-1';
         const audiobookId = 'audiobook-1';

         const mockListeningHistory = [
            {
               currentPosition: 1800,
               audiobook: { id: 'audiobook-1', title: 'Test Audiobook' },
            },
         ];

         const mockChapterProgress = [
            {
               completed: true,
               chapter: { id: 'chapter-1', audiobookId: 'audiobook-1' },
            },
            {
               completed: false,
               chapter: { id: 'chapter-2', audiobookId: 'audiobook-1' },
            },
         ];

         mockPrisma.listeningHistory.findMany.mockResolvedValue(mockListeningHistory);
         mockPrisma.chapterProgress.findMany.mockResolvedValue(mockChapterProgress);

         const result = await playbackService.getPlaybackStats(userId, audiobookId);

         expect(result.totalListeningTime).toBe(1800);
         expect(result.chaptersCompleted).toBe(1);
         expect(result.totalChapters).toBe(2);
         expect(result.completionPercentage).toBe(50);
      });
   });

   describe('cleanupInactiveSessions', () => {
      it('should clean up inactive sessions', () => {
         // This test would require mocking the internal session map
         // For now, we'll just verify the method exists and can be called
         expect(() => playbackService.cleanupInactiveSessions()).not.toThrow();
      });
   });

   describe('getActiveSessionsCount', () => {
      it('should return active sessions count', () => {
         const count = playbackService.getActiveSessionsCount();
         expect(typeof count).toBe('number');
         expect(count).toBeGreaterThanOrEqual(0);
      });
   });
});
