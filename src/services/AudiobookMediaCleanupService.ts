/**
 * Audiobook deletion with chapter media cleanup and chapter.deleted events.
 */
import { PrismaClient } from '@prisma/client';
import { RabbitMQFactory } from '../config/rabbitmq';
import { ApiError } from '../types/ApiError';
import { MessageHandler } from '../utils/MessageHandler';
import { mediaCleanupService } from './MediaCleanupService';

export class AudiobookMediaCleanupService {
   constructor(private prisma: PrismaClient) {}

   async deleteAudiobookWithChapters(audiobookId: string): Promise<void> {
      const audiobook = await this.prisma.audioBook.findUnique({
         where: { id: audiobookId },
         include: {
            chapters: true,
            offlineDownloads: { select: { filePath: true } },
         },
      });

      if (!audiobook) {
         throw ApiError.notFound(MessageHandler.getErrorMessage('not_found.audiobook'));
      }

      const rabbitMQ = RabbitMQFactory.getConnection();

      for (const chapter of audiobook.chapters) {
         await mediaCleanupService.deleteStoredFiles([
            chapter.filePath,
            chapter.coverImage,
            chapter.chapterCardCoverImage,
            chapter.maximizedChapterCoverImage,
            chapter.minimizedChapterCoverImage,
         ]);

         try {
            await rabbitMQ.publishChapterDeletion(chapter.id);
         } catch (error) {
            console.error(`Failed to publish chapter.deleted for chapter ${chapter.id}:`, error);
         }
      }

      await mediaCleanupService.deleteStoredFiles([
         audiobook.coverImage,
         ...audiobook.offlineDownloads.map((d) => d.filePath),
      ]);

      await this.prisma.audioBook.delete({
         where: { id: audiobookId },
      });
   }
}
