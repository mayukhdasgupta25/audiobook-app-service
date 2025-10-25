/**
 * Background Job Service
 * Handles background jobs using Bull queue for progress calculation and other tasks
 */
import Bull from 'bull';
import { PrismaClient } from '@prisma/client';
import { ChapterService } from './ChapterService';
import { ApiError } from '../types/ApiError';
import { RedisConfigHelper } from '../config/redis';

// Job data interfaces
export interface ProgressCalculationJobData {
   userProfileId: string;
   audiobookId: string;
   type: 'audiobook_progress' | 'chapter_progress';
}

export interface OfflineDownloadJobData {
   userProfileId: string;
   audiobookId: string;
   downloadId: string;
   quality?: 'high' | 'medium' | 'low';
   retryCount?: number;
}

export interface CleanupJobData {
   type: 'inactive_sessions' | 'expired_downloads' | 'old_progress_data';
}

export class BackgroundJobService {
   private progressQueue: Bull.Queue<ProgressCalculationJobData>;
   private downloadQueue: Bull.Queue<OfflineDownloadJobData>;
   private cleanupQueue: Bull.Queue<CleanupJobData>;
   private chapterService: ChapterService;

   constructor(private prisma: PrismaClient) {
      // Get Redis configuration
      const redisConfig = RedisConfigHelper.getConfigFromEnv();
      const redisUrl = RedisConfigHelper.getRedisUrl(redisConfig);

      // Initialize Bull queues
      this.progressQueue = new Bull('progress-calculation', {
         redis: redisUrl,
      });

      this.downloadQueue = new Bull('offline-download', {
         redis: redisUrl,
      });

      this.cleanupQueue = new Bull('cleanup', {
         redis: redisUrl,
      });

      this.chapterService = new ChapterService(prisma);

      this.setupJobProcessors();
      this.setupScheduledJobs();
   }

   /**
    * Setup job processors
    */
   private setupJobProcessors(): void {
      // Progress calculation processor
      this.progressQueue.process('calculate-progress', async (job) => {
         const { userProfileId, audiobookId, type } = job.data;

         try {
            if (type === 'audiobook_progress') {
               if (audiobookId === 'all') {
                  // Calculate progress for all audiobooks for all users
                  await this.calculateAllAudiobookProgress();
               } else {
                  // Validate audiobookId format (should be UUID)
                  if (!this.isValidUUID(audiobookId)) {
                     console.warn(`Invalid audiobookId format: ${audiobookId}, skipping progress calculation`);
                     return;
                  }
                  await this.calculateAudiobookProgress(userProfileId, audiobookId);
               }
            } else if (type === 'chapter_progress') {
               // Validate audiobookId format (should be UUID)
               if (!this.isValidUUID(audiobookId)) {
                  console.warn(`Invalid audiobookId format: ${audiobookId}, skipping chapter progress calculation`);
                  return;
               }
               await this.calculateChapterProgress(userProfileId, audiobookId);
            }

            console.log(`Progress calculation completed for user ${userProfileId}, audiobook ${audiobookId}`);
         } catch (error) {
            console.error('Progress calculation failed:', error);
            throw error;
         }
      });

      // Offline download processor
      this.downloadQueue.process('download-audiobook', async (job) => {
         const { userProfileId, audiobookId, downloadId, quality: _quality, retryCount = 0 } = job.data;

         try {
            await this.processOfflineDownload(userProfileId, audiobookId, downloadId, _quality);
            console.log(`Offline download completed for user ${userProfileId}, audiobook ${audiobookId}`);
         } catch (error) {
            console.error('Offline download failed:', error);

            // Retry logic
            if (retryCount < 3) {
               await this.scheduleOfflineDownload(userProfileId, audiobookId, downloadId, _quality, retryCount + 1);
            } else {
               // Mark download as failed
               await this.prisma.offlineDownload.update({
                  where: { id: downloadId },
                  data: {
                     status: 'FAILED',
                     errorMessage: error instanceof Error ? error.message : 'Unknown error',
                  },
               });
            }

            throw error;
         }
      });

      // Cleanup processor
      this.cleanupQueue.process('cleanup-data', async (job) => {
         const { type } = job.data;

         try {
            switch (type) {
               case 'inactive_sessions':
                  await this.cleanupInactiveSessions();
                  break;
               case 'expired_downloads':
                  await this.cleanupExpiredDownloads();
                  break;
               case 'old_progress_data':
                  await this.cleanupOldProgressData();
                  break;
            }

            console.log(`Cleanup job completed: ${type}`);
         } catch (error) {
            console.error('Cleanup job failed:', error);
            throw error;
         }
      });
   }

   /**
    * Setup scheduled jobs
    */
   private setupScheduledJobs(): void {
      // Schedule progress calculation every 5 minutes
      this.progressQueue.add('calculate-progress', {
         userProfileId: 'system',
         audiobookId: 'all',
         type: 'audiobook_progress'
      } as ProgressCalculationJobData, {
         repeat: { cron: '*/5 * * * *' },
         jobId: 'scheduled-progress-calculation',
      });

      // Schedule cleanup jobs
      this.cleanupQueue.add('cleanup-data', { type: 'inactive_sessions' } as CleanupJobData, {
         repeat: { cron: '0 */6 * * *' }, // Every 6 hours
         jobId: 'scheduled-cleanup-sessions',
      });

      this.cleanupQueue.add('cleanup-data', { type: 'expired_downloads' } as CleanupJobData, {
         repeat: { cron: '0 2 * * *' }, // Daily at 2 AM
         jobId: 'scheduled-cleanup-downloads',
      });

      this.cleanupQueue.add('cleanup-data', { type: 'old_progress_data' } as CleanupJobData, {
         repeat: { cron: '0 3 * * 0' }, // Weekly on Sunday at 3 AM
         jobId: 'scheduled-cleanup-progress',
      });
   }

   /**
    * Schedule audiobook progress calculation
    */
   async scheduleAudiobookProgressCalculation(userProfileId: string, audiobookId: string): Promise<void> {
      try {
         await this.progressQueue.add('calculate-progress', {
            userProfileId,
            audiobookId,
            type: 'audiobook_progress',
         }, {
            delay: 1000, // 1 second delay
            attempts: 3,
            backoff: {
               type: 'exponential',
               delay: 2000,
            },
         });
      } catch (_error) {
         throw new ApiError('Failed to schedule progress calculation', 500);
      }
   }

   /**
    * Schedule chapter progress calculation
    */
   async scheduleChapterProgressCalculation(userProfileId: string, audiobookId: string): Promise<void> {
      try {
         await this.progressQueue.add('calculate-progress', {
            userProfileId,
            audiobookId,
            type: 'chapter_progress',
         }, {
            delay: 500, // 0.5 second delay
            attempts: 3,
            backoff: {
               type: 'exponential',
               delay: 1000,
            },
         });
      } catch (_error) {
         throw new ApiError('Failed to schedule chapter progress calculation', 500);
      }
   }

   /**
    * Schedule offline download
    */
   async scheduleOfflineDownload(
      userProfileId: string,
      audiobookId: string,
      downloadId: string,
      quality?: 'high' | 'medium' | 'low',
      retryCount: number = 0
   ): Promise<void> {
      try {
         await this.downloadQueue.add('download-audiobook', {
            userProfileId,
            audiobookId,
            downloadId,
            quality: quality || 'medium',
            retryCount,
         }, {
            delay: retryCount > 0 ? retryCount * 5000 : 0, // Exponential backoff for retries
            attempts: 1, // We handle retries manually
         });
      } catch (_error) {
         throw new ApiError('Failed to schedule offline download', 500);
      }
   }


   /**
    * Validate if a string is a valid UUID
    */
   private isValidUUID(uuid: string): boolean {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
   }

   /**
    * Calculate progress for all audiobooks for all users
    */
   private async calculateAllAudiobookProgress(): Promise<void> {
      try {
         // Get all audiobooks
         const audiobooks = await this.prisma.audioBook.findMany({
            select: { id: true },
         });

         // Get all users who have listening history
         const users = await this.prisma.listeningHistory.findMany({
            select: { userProfileId: true },
            distinct: ['userProfileId'],
         });

         console.log(`Calculating progress for ${audiobooks.length} audiobooks and ${users.length} users`);

         // Calculate progress for each user-audiobook combination
         for (const user of users) {
            for (const audiobook of audiobooks) {
               try {
                  await this.calculateAudiobookProgress(user.userProfileId, audiobook.id);
               } catch (error) {
                  console.error(`Failed to calculate progress for user ${user.userProfileId}, audiobook ${audiobook.id}:`, error);
                  // Continue with other combinations even if one fails
               }
            }
         }

         console.log('Completed calculating progress for all audiobooks and users');
      } catch (error) {
         console.error('Failed to calculate all audiobook progress:', error);
         throw error;
      }
   }

   /**
    * Calculate audiobook progress
    */
   private async calculateAudiobookProgress(userProfileId: string, audiobookId: string): Promise<void> {
      try {
         // Verify audiobook exists
         const audiobook = await this.prisma.audioBook.findUnique({
            where: { id: audiobookId },
         });

         if (!audiobook) {
            console.warn(`Audiobook with ID ${audiobookId} not found, skipping progress calculation`);
            return;
         }

         const overallProgress = await this.chapterService.calculateAudiobookProgress(userProfileId, audiobookId);

         // Update audiobook overall progress
         await this.prisma.audioBook.update({
            where: { id: audiobookId },
            data: { overallProgress },
         });

         // Update listening history
         await this.prisma.listeningHistory.upsert({
            where: {
               userProfileId_audiobookId: {
                  userProfileId,
                  audiobookId,
               },
            },
            update: {
               completed: overallProgress >= 95, // Consider 95% as completed
            },
            create: {
               userProfileId,
               audiobookId,
               currentPosition: 0,
               completed: overallProgress >= 95,
            },
         });
      } catch (error) {
         console.error('Failed to calculate audiobook progress:', error);
         throw error;
      }
   }

   /**
    * Calculate chapter progress
    */
   private async calculateChapterProgress(userProfileId: string, audiobookId: string): Promise<void> {
      try {
         const chaptersWithProgress = await this.chapterService.getChaptersWithProgress(userProfileId, audiobookId);

         // Update chapter completion status
         for (const chapter of chaptersWithProgress) {
            if (chapter.overallProgress && chapter.overallProgress >= 95) {
               await this.prisma.chapterProgress.updateMany({
                  where: {
                     userProfileId,
                     chapterId: chapter.id,
                  },
                  data: {
                     completed: true,
                  },
               });
            }
         }
      } catch (error) {
         console.error('Failed to calculate chapter progress:', error);
         throw error;
      }
   }

   /**
    * Process offline download
    */
   private async processOfflineDownload(
      userProfileId: string,
      audiobookId: string,
      downloadId: string,
      _quality?: 'high' | 'medium' | 'low'
   ): Promise<void> {
      try {
         // Update download status to in progress
         await this.prisma.offlineDownload.update({
            where: { id: downloadId },
            data: {
               status: 'IN_PROGRESS',
               progress: 0,
            },
         });

         // Get audiobook details
         const audiobook = await this.prisma.audioBook.findUnique({
            where: { id: audiobookId },
         });

         if (!audiobook) {
            throw new Error('Audiobook not found');
         }

         // Simulate download process (in real implementation, this would handle actual file download)
         const totalSize = Number(audiobook.fileSize);
         let downloadedSize = 0;
         const chunkSize = Math.floor(totalSize / 100); // Simulate progress in chunks

         while (downloadedSize < totalSize) {
            downloadedSize += chunkSize;
            const progress = Math.min((downloadedSize / totalSize) * 100, 100);

            await this.prisma.offlineDownload.update({
               where: { id: downloadId },
               data: { progress },
            });

            // Simulate download time
            await new Promise(resolve => setTimeout(resolve, 100));
         }

         // Mark download as completed
         await this.prisma.offlineDownload.update({
            where: { id: downloadId },
            data: {
               status: 'COMPLETED',
               progress: 100,
               filePath: `/downloads/${userProfileId}/${audiobookId}.mp3`, // Simulated path
               fileSize: audiobook.fileSize,
               completedAt: new Date(),
            },
         });
      } catch (error) {
         console.error('Failed to process offline download:', error);
         throw error;
      }
   }

   /**
    * Cleanup inactive sessions
    */
   private async cleanupInactiveSessions(): Promise<void> {
      // This would clean up inactive playback sessions
      // Implementation depends on how sessions are stored
      console.log('Cleaning up inactive sessions...');
   }

   /**
    * Cleanup expired downloads
    */
   private async cleanupExpiredDownloads(): Promise<void> {
      try {
         const expiredDate = new Date();
         expiredDate.setDate(expiredDate.getDate() - 30); // 30 days ago

         const expiredDownloads = await this.prisma.offlineDownload.findMany({
            where: {
               status: 'COMPLETED',
               completedAt: {
                  lt: expiredDate,
               },
            },
         });

         for (const download of expiredDownloads) {
            // In real implementation, delete the actual file
            await this.prisma.offlineDownload.delete({
               where: { id: download.id },
            });
         }

         console.log(`Cleaned up ${expiredDownloads.length} expired downloads`);
      } catch (error) {
         console.error('Failed to cleanup expired downloads:', error);
      }
   }

   /**
    * Cleanup old progress data
    */
   private async cleanupOldProgressData(): Promise<void> {
      try {
         const oldDate = new Date();
         oldDate.setMonth(oldDate.getMonth() - 6); // 6 months ago

         // Clean up old chapter progress for completed chapters
         const deletedProgress = await this.prisma.chapterProgress.deleteMany({
            where: {
               completed: true,
               updatedAt: {
                  lt: oldDate,
               },
            },
         });

         console.log(`Cleaned up ${deletedProgress.count} old progress records`);
      } catch (error) {
         console.error('Failed to cleanup old progress data:', error);
      }
   }

   /**
    * Get queue statistics
    */
   async getQueueStats(): Promise<{
      progressQueue: any;
      downloadQueue: any;
      cleanupQueue: any;
   }> {
      try {
         const [progressStats, downloadStats, cleanupStats] = await Promise.all([
            this.progressQueue.getJobCounts(),
            this.downloadQueue.getJobCounts(),
            this.cleanupQueue.getJobCounts(),
         ]);

         return {
            progressQueue: progressStats,
            downloadQueue: downloadStats,
            cleanupQueue: cleanupStats,
         };
      } catch (_error) {
         throw new ApiError('Failed to retrieve queue statistics', 500);
      }
   }

   /**
    * Graceful shutdown
    */
   async shutdown(): Promise<void> {
      try {
         await Promise.all([
            this.progressQueue.close(),
            this.downloadQueue.close(),
            this.cleanupQueue.close(),
         ]);
      } catch (error) {
         console.error('Error during queue shutdown:', error);
      }
   }
}
