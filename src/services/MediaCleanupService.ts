/**
 * Media cleanup helper — deletes stored files from S3 in non-development environments.
 */
import { config } from '../config/env';
import { fileUrlService } from './FileUrlService';
import { FileUploadService } from './FileUploadService';

export class MediaCleanupService {
   private fileUploadService = new FileUploadService();

   async deleteStoredFile(stored: string | null | undefined): Promise<void> {
      if (!stored || config.NODE_ENV === 'development') {
         return;
      }

      const key = fileUrlService.normalizeToS3Key(stored);
      if (!key) {
         return;
      }

      try {
         await this.fileUploadService.deleteFile(key);
      } catch (error) {
         console.error(`Failed to delete stored file ${key}:`, error);
      }
   }

   async deleteStoredFiles(paths: Array<string | null | undefined>): Promise<void> {
      for (const path of paths) {
         await this.deleteStoredFile(path);
      }
   }
}

export const mediaCleanupService = new MediaCleanupService();
