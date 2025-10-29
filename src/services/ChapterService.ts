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

export class ChapterService {
   private fileUploadService: FileUploadService;

   constructor(private prisma: PrismaClient) {
      this.fileUploadService = new FileUploadService();
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
               startPosition: chapter.startPosition,
               endPosition: chapter.endPosition,
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
            startPosition: chapter.startPosition,
            endPosition: chapter.endPosition,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt
         } as ChapterData;
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
   async createChapter(chapterData: CreateChapterRequest, uploadedFile?: Express.Multer.File): Promise<ChapterData> {
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

         // Upload file if provided
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

         const chapter = await this.prisma.chapter.create({
            data: {
               ...chapterData,
               filePath,
               fileSize: BigInt(fileSize),
            },
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

         return {
            id: chapter.id,
            audiobookId: chapter.audiobookId,
            title: chapter.title,
            description: chapter.description || undefined,
            chapterNumber: chapter.chapterNumber,
            duration: chapter.duration,
            filePath: chapter.filePath,
            fileSize: Number(chapter.fileSize),
            startPosition: chapter.startPosition,
            endPosition: chapter.endPosition,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt
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
   async updateChapter(chapterId: string, updateData: UpdateChapterRequest): Promise<ChapterData> {
      try {
         const existingChapter = await this.prisma.chapter.findUnique({
            where: { id: chapterId },
         });

         if (!existingChapter) {
            throw new ApiError('Chapter not found', 404);
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

         const updatePayload: any = { ...updateData };
         if (updateData.fileSize) {
            updatePayload.fileSize = BigInt(updateData.fileSize);
         }

         const chapter = await this.prisma.chapter.update({
            where: { id: chapterId },
            data: updatePayload,
         });

         return {
            id: chapter.id,
            audiobookId: chapter.audiobookId,
            title: chapter.title,
            description: chapter.description || undefined,
            chapterNumber: chapter.chapterNumber,
            duration: chapter.duration,
            filePath: chapter.filePath,
            fileSize: Number(chapter.fileSize),
            startPosition: chapter.startPosition,
            endPosition: chapter.endPosition,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt
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

         await this.prisma.chapter.delete({
            where: { id: chapterId },
         });
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
