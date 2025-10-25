/**
 * Playback Service
 * Handles real-time audiobook playback functionality
 */
import { PrismaClient } from '@prisma/client';
import {
   PlaybackState,
   PlaybackSession,
   PlaybackStats,
   PlaybackSyncRequest,
   PlaybackControlRequest
} from '../models/PlaybackDto';
import { ApiError } from '../types/ApiError';
import { ErrorType } from '../types/common';

export class PlaybackService {
   private playbackSessions: Map<string, PlaybackSession> = new Map();

   constructor(private prisma: PrismaClient) { }

   /**
    * Initialize or get existing playback session
    */
   async initializePlaybackSession(userProfileId: string, audiobookId: string, chapterId?: string): Promise<PlaybackSession> {
      try {
         const sessionKey = `${userProfileId}-${audiobookId}`;

         // Check if session already exists
         if (this.playbackSessions.has(sessionKey)) {
            const session = this.playbackSessions.get(sessionKey)!;

            // Update chapter if provided
            if (chapterId) {
               session.currentChapterId = chapterId;
               session.currentPosition = 0; // Reset position when changing chapters
            }

            return session;
         }

         // Get user's listening history for this audiobook
         const listeningHistory = await this.prisma.listeningHistory.findUnique({
            where: {
               userProfileId_audiobookId: {
                  userProfileId,
                  audiobookId,
               },
            },
         });

         // Get chapter progress if chapterId is provided
         let currentPosition = 0;
         if (chapterId) {
            const chapterProgress = await this.prisma.chapterProgress.findUnique({
               where: {
                  userProfileId_chapterId: {
                     userProfileId,
                     chapterId,
                  },
               },
            });
            currentPosition = chapterProgress?.currentPosition || 0;
         } else if (listeningHistory) {
            currentPosition = listeningHistory.currentPosition;
         }

         // Create new session
         const session = {
            id: sessionKey,
            userProfileId,
            audiobookId,
            currentChapterId: chapterId || undefined,
            currentPosition,
            playbackSpeed: 1.0,
            volume: 100,
            isPlaying: false,
            lastUpdated: new Date(),
            sessionDuration: 0,
         } as PlaybackSession;

         this.playbackSessions.set(sessionKey, session);
         return session;
      } catch (_error) {
         throw new ApiError('Failed to initialize playback session', 500);
      }
   }

   /**
    * Sync playback state (play, pause, seek)
    */
   async syncPlayback(userProfileId: string, syncRequest: PlaybackSyncRequest): Promise<PlaybackState> {
      try {
         const sessionKey = `${userProfileId}-${syncRequest.audiobookId}`;
         const session = this.playbackSessions.get(sessionKey);

         if (!session) {
            throw new ApiError('Playback session not found. Please initialize session first.', 404);
         }

         // Handle different sync actions
         switch (syncRequest.action) {
            case 'play':
               session.isPlaying = true;
               break;
            case 'pause':
               session.isPlaying = false;
               break;
            case 'seek':
               if (syncRequest.position !== undefined) {
                  await this.seekToPosition(userProfileId, syncRequest.position, session);
               } else {
                  throw new ApiError('Position is required for seek action', 400);
               }
               break;
            default:
               throw new ApiError('Invalid sync action', 400);
         }

         // Update chapter if provided
         if (syncRequest.chapterId && syncRequest.chapterId !== session.currentChapterId) {
            session.currentChapterId = syncRequest.chapterId;
            if (syncRequest.action !== 'seek') {
               session.currentPosition = 0; // Reset position when changing chapters (unless seeking)
            }
         }

         session.lastUpdated = new Date();
         this.playbackSessions.set(sessionKey, session);

         // Update database with progress
         await this.updatePlaybackProgress(session);

         return this.getPlaybackState(session);
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to sync playback', 500);
      }
   }

   /**
    * Seek to a specific position
    */
   async seekToPosition(userProfileId: string, position: number, session?: PlaybackSession): Promise<void> {
      try {
         const sessionKey = `${userProfileId}-${session?.audiobookId}`;
         const currentSession = session || this.playbackSessions.get(sessionKey);

         if (!currentSession) {
            throw new ApiError('Playback session not found', 404);
         }

         // Validate position
         if (position < 0) {
            throw new ApiError('Position cannot be negative', 400);
         }

         // If we have a chapter, validate against chapter duration
         if (currentSession.currentChapterId) {
            const chapter = await this.prisma.chapter.findUnique({
               where: { id: currentSession.currentChapterId },
            });

            if (chapter && position > chapter.duration) {
               throw new ApiError('Position cannot exceed chapter duration', 400);
            }
         }

         currentSession.currentPosition = position;
         currentSession.lastUpdated = new Date();
         this.playbackSessions.set(sessionKey, currentSession);

         // Update chapter progress if applicable
         if (currentSession.currentChapterId) {
            await this.prisma.chapterProgress.upsert({
               where: {
                  userProfileId_chapterId: {
                     userProfileId,
                     chapterId: currentSession.currentChapterId,
                  },
               },
               update: {
                  currentPosition: position,
                  lastListenedAt: new Date(),
               },
               create: {
                  userProfileId,
                  chapterId: currentSession.currentChapterId,
                  currentPosition: position,
                  lastListenedAt: new Date(),
               },
            });
         }
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to seek to position', 500);
      }
   }

   /**
    * Get current playback state
    */
   getPlaybackState(session: PlaybackSession): PlaybackState {
      return {
         isPlaying: session.isPlaying,
         currentPosition: session.currentPosition,
         playbackSpeed: session.playbackSpeed,
         volume: session.volume,
         currentChapterId: session.currentChapterId || undefined,
         audiobookId: session.audiobookId,
         userProfileId: session.userProfileId,
      } as PlaybackState;
   }

   /**
    * Update playback progress in database
    */
   private async updatePlaybackProgress(session: PlaybackSession): Promise<void> {
      try {
         // Update listening history
         await this.prisma.listeningHistory.upsert({
            where: {
               userProfileId_audiobookId: {
                  userProfileId: session.userProfileId,
                  audiobookId: session.audiobookId,
               },
            },
            update: {
               currentPosition: session.currentPosition,
               lastListenedAt: new Date(),
            },
            create: {
               userProfileId: session.userProfileId,
               audiobookId: session.audiobookId,
               currentPosition: session.currentPosition,
               lastListenedAt: new Date(),
            },
         });
      } catch (error) {
         console.error('Failed to update playback progress:', error);
      }
   }

   /**
    * Get playback statistics for a user
    */
   async getPlaybackStats(userProfileId: string, audiobookId?: string): Promise<PlaybackStats> {
      try {
         const whereClause = audiobookId
            ? { userProfileId, audiobookId }
            : { userProfileId };

         const [listeningHistory, chapterProgress] = await Promise.all([
            this.prisma.listeningHistory.findMany({
               where: whereClause,
               include: {
                  audiobook: {
                     select: {
                        id: true,
                        title: true,
                     },
                  },
               },
            }),
            this.prisma.chapterProgress.findMany({
               where: whereClause,
               include: {
                  chapter: {
                     select: {
                        id: true,
                        audiobookId: true,
                     },
                  },
               },
            }),
         ]);

         const totalListeningTime = listeningHistory.reduce((sum, history) => {
            return sum + history.currentPosition;
         }, 0);

         const completedChapters = chapterProgress.filter(progress => progress.completed).length;
         const totalChapters = chapterProgress.length;

         return {
            totalListeningTime,
            averageSessionDuration: totalListeningTime / Math.max(listeningHistory.length, 1),
            mostUsedSpeed: 1.0, // TODO: Track this in session data
            chaptersCompleted: completedChapters,
            totalChapters,
            completionPercentage: totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0,
         };
      } catch (_error) {
         throw new ApiError('Failed to retrieve playback statistics', 500);
      }
   }

   /**
    * Clean up inactive sessions
    */
   cleanupInactiveSessions(): void {
      const now = new Date();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

      for (const [sessionKey, session] of Array.from(this.playbackSessions.entries())) {
         if (now.getTime() - session.lastUpdated.getTime() > inactiveThreshold) {
            this.playbackSessions.delete(sessionKey);
         }
      }
   }

   /**
    * Handle playback control requests
    */
   async handlePlaybackControl(userProfileId: string, controlRequest: PlaybackControlRequest): Promise<PlaybackState> {
      try {
         const sessionKey = `${userProfileId}-${controlRequest.audiobookId}`;
         let session = this.playbackSessions.get(sessionKey);

         if (!session) {
            session = await this.initializePlaybackSession(userProfileId, controlRequest.audiobookId, controlRequest.chapterId);
         }

         switch (controlRequest.action) {
            case 'play':
               session.isPlaying = true;
               break;
            case 'pause':
               session.isPlaying = false;
               break;
            case 'stop':
               session.isPlaying = false;
               session.currentPosition = 0;
               break;
            case 'seek':
               if (controlRequest.position !== undefined) {
                  await this.seekToPosition(userProfileId, controlRequest.position, session);
               }
               break;
            case 'speed':
               if (controlRequest.speed !== undefined) {
                  session.playbackSpeed = controlRequest.speed;
               }
               break;
            case 'volume':
               if (controlRequest.volume !== undefined) {
                  session.volume = Math.max(0, Math.min(1, controlRequest.volume));
               }
               break;
         }

         return {
            isPlaying: session.isPlaying,
            currentPosition: session.currentPosition,
            audiobookId: session.audiobookId,
            ...(session.currentChapterId && { currentChapterId: session.currentChapterId }),
            playbackSpeed: session.playbackSpeed,
            volume: session.volume,
            userProfileId: session.userProfileId
         };
      } catch (error: any) {
         console.error('Playback control error:', error);
         throw new ApiError('Failed to handle playback control', 500, ErrorType.INTERNAL_ERROR);
      }
   }

   /**
    * Change playback speed
    */
   async changePlaybackSpeed(userProfileId: string, audiobookId: string, speed: number): Promise<void> {
      try {
         const sessionKey = `${userProfileId}-${audiobookId}`;
         const session = this.playbackSessions.get(sessionKey);

         if (session) {
            session.playbackSpeed = Math.max(0.5, Math.min(3.0, speed));
         }
      } catch (error: any) {
         console.error('Change playback speed error:', error);
         throw new ApiError('Failed to change playback speed', 500, ErrorType.INTERNAL_ERROR);
      }
   }

   /**
    * Navigate to a specific chapter
    */
   async navigateToChapter(userProfileId: string, audiobookId: string, chapterId: string): Promise<void> {
      try {
         const sessionKey = `${userProfileId}-${audiobookId}`;
         const session = this.playbackSessions.get(sessionKey);

         if (session) {
            session.currentChapterId = chapterId;
            session.currentPosition = 0;
         } else {
            await this.initializePlaybackSession(userProfileId, audiobookId, chapterId);
         }
      } catch (error: any) {
         console.error('Navigate to chapter error:', error);
         throw new ApiError('Failed to navigate to chapter', 500, ErrorType.INTERNAL_ERROR);
      }
   }

   /**
    * Get active sessions count
    */
   getActiveSessionsCount(): number {
      return this.playbackSessions.size;
   }
}
