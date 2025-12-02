/**
 * Chapter Service
 * Handles business logic for chapter management
 */
import { PrismaClient } from '@prisma/client';
import {
   ChapterData,
   ChapterWithRelations,
   CreateChapterRequest,
   UpdateChapterRequest,
   ChapterQueryParams,
   ChapterWithProgress,
   ChapterNavigation,
   ChapterProgressData,
   UpdateChapterProgressRequest
} from '../models/ChapterDto';
import { ApiError } from '../types/ApiError';
import { RabbitMQFactory, TranscodingJobData } from '../config/rabbitmq';
import { config } from '../config/env';
import { FileUploadService } from './FileUploadService';
import { BackgroundJobService } from './BackgroundJobService';
import { ImageProcessingService } from './ImageProcessingService';
import { validateChapterCoverImageOrThrow } from '../utils/ImageValidator';
import path from 'path';
import { getFileUrl } from '../middleware/UploadMiddleware';

export class ChapterService {
   private fileUploadService: FileUploadService;
   private backgroundJobService: BackgroundJobService | undefined;
   private imageProcessingService: ImageProcessingService;

   constructor(private prisma: PrismaClient, backgroundJobService?: BackgroundJobService) {
      this.fileUploadService = new FileUploadService();
      this.backgroundJobService = backgroundJobService;
      this.imageProcessingService = new ImageProcessingService();
   }

   /**
    * Get all chapters for a specific audiobook
    */
   async getChaptersByAudiobookId(audiobookId: string, queryParams?: ChapterQueryParams): Promise<{
      chapters: ChapterWithRelations[];
      totalCount: number;
   }> {
      try {
         const { page = 1, limit = 50, sortBy = 'chapterNumber', sortOrder = 'asc' } = queryParams || {};
         const skip = (page - 1) * limit;

         const [chapters, totalCount] = await Promise.all([
            this.prisma.chapter.findMany({
               where: { audiobookId },
               include: {
                  audiobook: {
                     select: {
                        id: true,
                        title: true,
                        author: true,
                     },
                  },
                  chapterProgress: true,
                  bookmarks: true,
                  notes: true,
               },
               orderBy: { [sortBy]: sortOrder },
               skip,
               take: limit,
            }),
            this.prisma.chapter.count({
               where: { audiobookId },
            }),
         ]);

         return {
            chapters: chapters.map(chapter => ({
               id: chapter.id,
               audiobookId: chapter.audiobookId,
               title: chapter.title,
               description: chapter.description || undefined,
               chapterNumber: chapter.chapterNumber,
               duration: chapter.duration,
               filePath: chapter.filePath,
               fileSize: Number(chapter.fileSize),
               coverImage: chapter.coverImage,
               chapterCardCoverImage: chapter.chapterCardCoverImage || undefined,
               maximizedChapterCoverImage: chapter.maximizedChapterCoverImage || undefined,
               minimizedChapterCoverImage: chapter.minimizedChapterCoverImage || undefined,
               startPosition: chapter.startPosition,
               endPosition: chapter.endPosition,
               isActive: chapter.isActive,
               scheduledAt: chapter.scheduledAt ?? null,
               createdAt: chapter.createdAt,
               updatedAt: chapter.updatedAt,
               audiobook: chapter.audiobook,
               bookmarks: chapter.bookmarks,
               notes: chapter.notes,
               chapterProgress: chapter.chapterProgress
            } as ChapterWithRelations)),
            totalCount
         };
      } catch (_error) {
         throw new ApiError('Failed to retrieve chapters', 500);
      }
   }

   /**
    * Get a specific chapter by ID
    */
   async getChapterById(chapterId: string): Promise<ChapterWithRelations> {
      try {
         const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
               audiobook: {
                  select: {
                     id: true,
                     title: true,
                     author: true,
                  },
               },
               chapterProgress: true,
               bookmarks: true,
               notes: true,
            },
         });

         if (!chapter) {
            throw new ApiError('Chapter not found', 404);
         }

         return {
            id: chapter.id,
            audiobookId: chapter.audiobookId,
            title: chapter.title,
            description: chapter.description || undefined,
            chapterNumber: chapter.chapterNumber,
            duration: chapter.duration,
            filePath: chapter.filePath,
            fileSize: Number(chapter.fileSize),
            coverImage: chapter.coverImage,
            chapterCardCoverImage: chapter.chapterCardCoverImage || undefined,
            maximizedChapterCoverImage: chapter.maximizedChapterCoverImage || undefined,
            minimizedChapterCoverImage: chapter.minimizedChapterCoverImage || undefined,
            startPosition: chapter.startPosition,
            endPosition: chapter.endPosition,
            isActive: chapter.isActive,
            scheduledAt: chapter.scheduledAt || undefined,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt,
            audiobook: chapter.audiobook,
            chapterProgress: chapter.chapterProgress,
            bookmarks: chapter.bookmarks,
            notes: chapter.notes
         } as ChapterWithRelations;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to retrieve chapter', 500);
      }
   }

   /**
    * Create a new chapter
    */
   async createChapter(
      chapterData: CreateChapterRequest,
      uploadedFile?: Express.Multer.File,
      uploadedCoverImage?: Express.Multer.File
   ): Promise<ChapterData> {
      try {
         // Validate audiobook exists
         const audiobook = await this.prisma.audioBook.findUnique({
            where: { id: chapterData.audiobookId },
         });

         if (!audiobook) {
            throw new ApiError('Audiobook not found', 404);
         }

         // Check if chapter number already exists for this audiobook
         const existingChapter = await this.prisma.chapter.findFirst({
            where: {
               audiobookId: chapterData.audiobookId,
               chapterNumber: chapterData.chapterNumber,
            },
         });

         if (existingChapter) {
            throw new ApiError('Chapter number already exists for this audiobook', 400);
         }

         // Upload audio file if provided
         let filePath = chapterData.filePath || '';
         let fileSize = chapterData.fileSize || 0;

         if (uploadedFile) {
            const uploadResult = await this.fileUploadService.uploadFile(
               uploadedFile,
               '/uploads/chapters'
            );
            filePath = uploadResult.filePath;
            fileSize = uploadResult.fileSize;
         }

         // Handle coverImage - it's required, so it must be provided via upload or in chapterData
         let coverImage = chapterData.coverImage;
         let coverImagePath: string | undefined;

         if (uploadedCoverImage) {
            // Validate cover image dimensions
            try {
               validateChapterCoverImageOrThrow(uploadedCoverImage.path);
            } catch (validationError: any) {
               // Delete the uploaded file if validation fails
               const fs = require('fs');
               if (fs.existsSync(uploadedCoverImage.path)) {
                  fs.unlinkSync(uploadedCoverImage.path);
               }
               throw new ApiError(validationError.message || 'Invalid chapter cover image dimensions', 400);
            }

            // Store the path for thumbnail generation
            coverImagePath = uploadedCoverImage.path;
            // In local environment, multer already saved the file to the correct directory
            // Just convert the path to a URL using getFileUrl (similar to audiobooks)
            coverImage = getFileUrl(uploadedCoverImage.path);
         }

         // Validate that coverImage is provided
         if (!coverImage) {
            throw new ApiError('Cover image is required', 400);
         }

         // Handle scheduledAt: if provided, set isActive=false
         const createData: any = {
            ...chapterData,
            filePath,
            fileSize: BigInt(fileSize),
            coverImage,
         };

         // Generate thumbnails from cover image if provided
         if (coverImagePath) {
            try {
               const thumbnailOutputDir = path.join(config.DEV_UPLOAD_DIR, 'images', 'chapters', 'thumbnails');
               const thumbnails = await this.imageProcessingService.generateChapterThumbnails(coverImagePath, thumbnailOutputDir);
               createData.chapterCardCoverImage = thumbnails.chapterCard;
               createData.maximizedChapterCoverImage = thumbnails.maximized;
               createData.minimizedChapterCoverImage = thumbnails.minimized;
            } catch (thumbnailError: any) {
               console.error('Failed to generate chapter thumbnails from cover image:', thumbnailError);
               // Don't fail chapter creation if thumbnail generation fails
            }
         }

         if (chapterData.scheduledAt !== undefined) {
            createData.scheduledAt = chapterData.scheduledAt;
            createData.isActive = false;
         } else {
            createData.isActive = chapterData.isActive ?? true; // Default to true if not provided
         }

         const chapter = await this.prisma.chapter.create({
            data: createData,
         });

         // Publish transcoding job to RabbitMQ
         try {
            const jobData: TranscodingJobData = {
               chapter: {
                  id: chapter.id,
                  audiobookId: chapter.audiobookId,
                  title: chapter.title,
                  ...(chapter.description && { description: chapter.description }),
                  chapterNumber: chapter.chapterNumber,
                  duration: chapter.duration,
                  filePath: chapter.filePath,
                  fileSize: Number(chapter.fileSize),
                  startPosition: chapter.startPosition,
                  endPosition: chapter.endPosition,
                  createdAt: chapter.createdAt,
                  updatedAt: chapter.updatedAt,
               },
               bitrates: config.TRANSCODING_BITRATES,
               priority: 'normal'
            };

            const rabbitMQ = RabbitMQFactory.getConnection();
            const published = await rabbitMQ.publishTranscodingJob(jobData, 'normal');

            if (published) {
               console.log(`Transcoding job published for new chapter ${chapter.id}`);
            } else {
               // console.error(`Failed to publish transcoding job for chapter ${chapter.id}`);
            }
         } catch (_error) {
            // Log error but don't fail chapter creation
            // console.error(`Error publishing transcoding job for chapter ${chapter.id}:`, error);
         }

         // Schedule audiobook duration calculation job
         if (this.backgroundJobService) {
            try {
               console.log(`Scheduling duration calculation for audiobook ${chapter.audiobookId}`);
               await this.backgroundJobService.scheduleAudiobookDurationCalculation(chapter.audiobookId);
            } catch (_error) {
               // Log error but don't fail chapter creation
               console.error(`Error scheduling duration calculation for audiobook ${chapter.audiobookId}:`, _error);
            }

            // Schedule activation job if scheduledAt was provided
            if (chapterData.scheduledAt !== undefined) {
               try {
                  await this.backgroundJobService.scheduleActivationJob('chapter', chapter.id, chapterData.scheduledAt);
               } catch (_error) {
                  // Log error but don't fail chapter creation
                  console.error(`Error scheduling activation job for chapter ${chapter.id}:`, _error);
               }
            }
         }

         return {
            id: chapter.id,
            audiobookId: chapter.audiobookId,
            title: chapter.title,
            description: chapter.description || undefined,
            chapterNumber: chapter.chapterNumber,
            duration: chapter.duration,
            filePath: chapter.filePath,
            fileSize: Number(chapter.fileSize),
            coverImage: chapter.coverImage,
            chapterCardCoverImage: chapter.chapterCardCoverImage || undefined,
            maximizedChapterCoverImage: chapter.maximizedChapterCoverImage || undefined,
            minimizedChapterCoverImage: chapter.minimizedChapterCoverImage || undefined,
            startPosition: chapter.startPosition,
            endPosition: chapter.endPosition,
            isActive: chapter.isActive,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt,
            scheduledAt: chapter.scheduledAt || undefined
         } as ChapterData;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to create chapter', 500);
      }
   }

   /**
    * Update an existing chapter
    */
   async updateChapter(
      chapterId: string,
      updateData: UpdateChapterRequest,
      uploadedFile?: Express.Multer.File,
      uploadedCoverImage?: Express.Multer.File
   ): Promise<ChapterData> {
      try {
         const existingChapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
         });

         if (!existingChapter) {
            throw new ApiError('Chapter not found', 404);
         }

         // Validate: Cannot schedule an active chapter
         if (updateData.scheduledAt !== undefined && existingChapter.isActive) {
            throw new ApiError('Active chapter cannot be scheduled', 400);
         }

         // If updating chapter number, check for conflicts
         if (updateData.chapterNumber && updateData.chapterNumber !== existingChapter.chapterNumber) {
            const conflictingChapter = await this.prisma.chapter.findFirst({
               where: {
                  audiobookId: existingChapter.audiobookId,
                  chapterNumber: updateData.chapterNumber,
                  id: { not: chapterId },
               },
            });

            if (conflictingChapter) {
               throw new ApiError('Chapter number already exists for this audiobook', 400);
            }
         }

         // Upload audio file if provided
         let filePath = updateData.filePath;
         let fileSize = updateData.fileSize;

         if (uploadedFile) {
            // Delete old file if it exists
            if (existingChapter.filePath) {
               try {
                  const fs = require('fs');
                  if (fs.existsSync(existingChapter.filePath)) {
                     fs.unlinkSync(existingChapter.filePath);
                  }
               } catch (_error) {
                  // Log error but don't fail update
                  console.error(`Error deleting old file for chapter ${chapterId}:`, _error);
               }
            }

            const uploadResult = await this.fileUploadService.uploadFile(
               uploadedFile,
               '/uploads/chapters'
            );
            filePath = uploadResult.filePath;
            fileSize = uploadResult.fileSize;
         }

         // Handle coverImage upload if provided
         let coverImage = updateData.coverImage;
         let coverImagePath: string | undefined;

         if (uploadedCoverImage) {
            // Validate cover image dimensions
            try {
               validateChapterCoverImageOrThrow(uploadedCoverImage.path);
            } catch (validationError: any) {
               // Delete the uploaded file if validation fails
               const fs = require('fs');
               if (fs.existsSync(uploadedCoverImage.path)) {
                  fs.unlinkSync(uploadedCoverImage.path);
               }
               throw new ApiError(validationError.message || 'Invalid chapter cover image dimensions', 400);
            }

            // Delete old cover image and thumbnails if they exist
            if (existingChapter.coverImage) {
               try {
                  const fs = require('fs');
                  const path = require('path');
                  // Extract the actual file path from the URL if it's a URL
                  let oldImagePath = existingChapter.coverImage;
                  // If it's a URL starting with /uploads, convert to file path
                  if (oldImagePath.startsWith('/uploads')) {
                     oldImagePath = path.join(config.DEV_UPLOAD_DIR, oldImagePath.replace('/uploads', ''));
                  }
                  if (fs.existsSync(oldImagePath)) {
                     fs.unlinkSync(oldImagePath);
                  }

                  // Delete old thumbnails if they exist (in development)
                  if (config.NODE_ENV === 'development') {
                     const oldThumbnails = [
                        existingChapter.chapterCardCoverImage,
                        existingChapter.maximizedChapterCoverImage,
                        existingChapter.minimizedChapterCoverImage
                     ];
                     oldThumbnails.forEach(thumbnailUrl => {
                        if (thumbnailUrl && thumbnailUrl.startsWith('/uploads')) {
                           const thumbnailPath = path.join(config.DEV_UPLOAD_DIR, thumbnailUrl.replace('/uploads', ''));
                           if (fs.existsSync(thumbnailPath)) {
                              try {
                                 fs.unlinkSync(thumbnailPath);
                              } catch (_err) {
                                 // Ignore errors when deleting old thumbnails
                              }
                           }
                        }
                     });
                  }
               } catch (_error) {
                  // Log error but don't fail update
                  console.error(`Error deleting old cover image for chapter ${chapterId}:`, _error);
               }
            }

            // Store the path for thumbnail generation
            coverImagePath = uploadedCoverImage.path;
            // In local environment, multer already saved the file to the correct directory
            // Just convert the path to a URL using getFileUrl (similar to audiobooks)
            coverImage = getFileUrl(uploadedCoverImage.path);
         }

         // Ensure coverImage is always set (required field)
         if (coverImage === undefined) {
            coverImage = existingChapter.coverImage || '';
         }

         const updatePayload: any = { ...updateData };
         if (filePath !== undefined) {
            updatePayload.filePath = filePath;
         }
         if (fileSize !== undefined) {
            updatePayload.fileSize = BigInt(fileSize);
         }
         if (coverImage !== undefined) {
            updatePayload.coverImage = coverImage;
         }

         // Generate thumbnails from cover image if a new one was uploaded
         if (coverImagePath) {
            try {
               const thumbnailOutputDir = path.join(config.DEV_UPLOAD_DIR, 'images', 'chapters', 'thumbnails');
               const thumbnails = await this.imageProcessingService.generateChapterThumbnails(coverImagePath, thumbnailOutputDir);
               updatePayload.chapterCardCoverImage = thumbnails.chapterCard;
               updatePayload.maximizedChapterCoverImage = thumbnails.maximized;
               updatePayload.minimizedChapterCoverImage = thumbnails.minimized;
            } catch (thumbnailError: any) {
               console.error('Failed to generate chapter thumbnails from cover image:', thumbnailError);
               // Don't fail chapter update if thumbnail generation fails
            }
         }

         // Handle scheduledAt: if provided, set isActive=false
         if (updateData.scheduledAt !== undefined) {
            updatePayload.isActive = false;
         }

         const chapter = await this.prisma.chapter.update({
            where: { id: chapterId },
            data: updatePayload,
         });

         // Schedule activation job if scheduledAt was provided
         if (updateData.scheduledAt !== undefined && this.backgroundJobService) {
            try {
               await this.backgroundJobService.scheduleActivationJob('chapter', chapterId, updateData.scheduledAt);
            } catch (_error) {
               // Log error but don't fail chapter update
               console.error(`Error scheduling activation job for chapter ${chapterId}:`, _error);
            }
         }

         // Schedule audiobook duration calculation job if duration was updated
         if (this.backgroundJobService && (updateData.duration !== undefined)) {
            try {
               await this.backgroundJobService.scheduleAudiobookDurationCalculation(chapter.audiobookId);
            } catch (_error) {
               // Log error but don't fail chapter update
               console.error(`Error scheduling duration calculation for audiobook ${chapter.audiobookId}:`, _error);
            }
         }

         return {
            id: chapter.id,
            audiobookId: chapter.audiobookId,
            title: chapter.title,
            description: chapter.description || undefined,
            chapterNumber: chapter.chapterNumber,
            duration: chapter.duration,
            filePath: chapter.filePath,
            fileSize: Number(chapter.fileSize),
            coverImage: chapter.coverImage,
            chapterCardCoverImage: chapter.chapterCardCoverImage || undefined,
            maximizedChapterCoverImage: chapter.maximizedChapterCoverImage || undefined,
            minimizedChapterCoverImage: chapter.minimizedChapterCoverImage || undefined,
            startPosition: chapter.startPosition,
            endPosition: chapter.endPosition,
            isActive: chapter.isActive,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt,
            scheduledAt: chapter.scheduledAt ?? null,
         } as ChapterData;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to update chapter', 500);
      }
   }

   /**
    * Delete a chapter
    */
   async deleteChapter(chapterId: string): Promise<void> {
      try {
         const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
         });

         if (!chapter) {
            throw new ApiError('Chapter not found', 404);
         }

         const audiobookId = chapter.audiobookId;

         await this.prisma.chapter.delete({
            where: { id: chapterId },
         });

         // Publish chapter deletion event to RabbitMQ
         try {
            const rabbitMQ = RabbitMQFactory.getConnection();
            const published = await rabbitMQ.publishChapterDeletion(chapterId);

            if (published) {
               console.log(`Chapter deletion event published for chapter ${chapterId}`);
            } else {
               console.error(`Failed to publish chapter deletion event for chapter ${chapterId}`);
            }
         } catch (_error) {
            // Log error but don't fail chapter deletion
            console.error(`Error publishing chapter deletion event for chapter ${chapterId}:`, _error);
         }

         // Schedule audiobook duration calculation job after deletion
         if (this.backgroundJobService) {
            try {
               await this.backgroundJobService.scheduleAudiobookDurationCalculation(audiobookId);
            } catch (_error) {
               // Log error but don't fail chapter deletion
               console.error(`Error scheduling duration calculation for audiobook ${audiobookId}:`, _error);
            }
         }
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to delete chapter', 500);
      }
   }

   /**
    * Get chapter progress for a user
    */
   async getChapterProgress(userProfileId: string, chapterId: string): Promise<ChapterProgressData | null> {
      try {
         const progress = await this.prisma.chapterProgress.findUnique({
            where: {
               userProfileId_chapterId: {
                  userProfileId,
                  chapterId,
               },
            },
         });

         return progress;
      } catch (_error) {
         throw new ApiError('Failed to retrieve chapter progress', 500);
      }
   }

   /**
    * Update chapter progress for a user
    */
   async updateChapterProgress(
      userProfileId: string,
      chapterId: string,
      progressData: UpdateChapterProgressRequest
   ): Promise<ChapterProgressData> {
      try {
         // Verify chapter exists
         const chapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
         });

         if (!chapter) {
            throw new ApiError('Chapter not found', 404);
         }

         // Validate position is within chapter duration
         if (progressData.currentPosition > chapter.duration) {
            throw new ApiError('Position cannot exceed chapter duration', 400);
         }

         const progress = await this.prisma.chapterProgress.upsert({
            where: {
               userProfileId_chapterId: {
                  userProfileId,
                  chapterId,
               },
            },
            update: {
               currentPosition: progressData.currentPosition,
               completed: progressData.completed || false,
               lastListenedAt: new Date(),
            },
            create: {
               userProfileId,
               chapterId,
               currentPosition: progressData.currentPosition,
               completed: progressData.completed || false,
               lastListenedAt: new Date(),
            },
         });

         return progress;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to update chapter progress', 500);
      }
   }

   /**
    * Get chapter with user progress
    */
   async getChapterWithProgress(userProfileId: string, chapterId: string): Promise<ChapterWithProgress> {
      try {
         const chapter = await this.getChapterById(chapterId);
         const userProgress = await this.getChapterProgress(userProfileId, chapterId);

         const overallProgress = userProgress
            ? (userProgress.currentPosition / chapter.duration) * 100
            : 0;

         return {
            ...chapter,
            userProgress: userProgress || undefined,
            overallProgress,
         } as ChapterWithProgress;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to retrieve chapter with progress', 500);
      }
   }

   /**
    * Get chapter navigation (previous/next chapters)
    */
   async getChapterNavigation(userProfileId: string, chapterId: string): Promise<ChapterNavigation> {
      try {
         const currentChapter = await this.getChapterWithProgress(userProfileId, chapterId);

         // Get all chapters for the audiobook ordered by chapter number
         const allChapters = await this.prisma.chapter.findMany({
            where: { audiobookId: currentChapter.audiobookId },
            orderBy: { chapterNumber: 'asc' },
         });

         const currentIndex = allChapters.findIndex(ch => ch.id === chapterId);

         const previousChapter = currentIndex > 0
            ? await this.getChapterWithProgress(userProfileId, allChapters[currentIndex - 1]!.id)
            : undefined;

         const nextChapter = currentIndex < allChapters.length - 1
            ? await this.getChapterWithProgress(userProfileId, allChapters[currentIndex + 1]!.id)
            : undefined;

         return {
            currentChapter,
            previousChapter,
            nextChapter,
            totalChapters: allChapters.length,
            currentChapterIndex: currentIndex,
         } as ChapterNavigation;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to retrieve chapter navigation', 500);
      }
   }

   /**
    * Get all chapters with progress for an audiobook
    */
   async getChaptersWithProgress(userProfileId: string, audiobookId: string): Promise<ChapterWithProgress[]> {
      try {
         const { chapters } = await this.getChaptersByAudiobookId(audiobookId);

         const chaptersWithProgress = await Promise.all(
            chapters.map(async (chapter) => {
               const userProgress = await this.getChapterProgress(userProfileId, chapter.id);
               const overallProgress = userProgress
                  ? (userProgress.currentPosition / chapter.duration) * 100
                  : 0;

               return {
                  ...chapter,
                  userProgress,
                  overallProgress,
               };
            })
         );

         return chaptersWithProgress.map(chapter => ({
            ...chapter,
            userProgress: chapter.userProgress || undefined
         } as ChapterWithProgress));
      } catch (_error) {
         throw new ApiError('Failed to retrieve chapters with progress', 500);
      }
   }

   /**
    * Calculate overall audiobook progress based on chapter progress
    */
   async calculateAudiobookProgress(userProfileId: string, audiobookId: string): Promise<number> {
      try {
         const chaptersWithProgress = await this.getChaptersWithProgress(userProfileId, audiobookId);

         if (chaptersWithProgress.length === 0) {
            return 0;
         }

         const totalProgress = chaptersWithProgress.reduce((sum, chapter) => {
            return sum + (chapter.overallProgress || 0);
         }, 0);

         return totalProgress / chaptersWithProgress.length;
      } catch (_error) {
         throw new ApiError('Failed to calculate audiobook progress', 500);
      }
   }
}
