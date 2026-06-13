/**
 * Image Processing Service
 * Handles thumbnail generation from cover images using ffmpeg
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';
import { StorageFactory } from './storage/StorageFactory';
import { resolveFfmpegPath } from '../utils/ffmpegPath';

const execAsync = promisify(exec);

export interface ThumbnailPaths {
   homeHero: string;
   contentCard: string;
   chaptersHero: string;
}

export interface ChapterThumbnailPaths {
   chapterCard: string;
   maximized: string;
   minimized: string;
}

export interface ThumbnailConfig {
   width: number;
   height: number;
   aspectRatio: string;
}

/**
 * Image dimensions configuration based on requirements
 */
const THUMBNAIL_CONFIGS: {
   homeHero: ThumbnailConfig;
   contentCard: ThumbnailConfig;
   chaptersHero: ThumbnailConfig;
} = {
   homeHero: {
      width: 1284,
      height: 1800,
      aspectRatio: '5:7'
   },
   contentCard: {
      width: 420,
      height: 294,
      aspectRatio: '10:7'
   },
   chaptersHero: {
      width: 1284,
      height: 900,
      aspectRatio: '1.427:1'
   }
};

export class ImageProcessingService {
   /**
    * Generate thumbnails from a cover image using ffmpeg
    * @param coverImagePath Path to the cover image file
    * @param outputDir Directory where thumbnails will be saved (development only)
    * @returns Object containing paths/URLs to the three generated thumbnails
    */
   async generateThumbnails(
      coverImagePath: string,
      outputDir: string
   ): Promise<ThumbnailPaths> {
      // Generate unique prefix for this set of thumbnails
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

      try {
         // Check if cover image exists
         if (!fs.existsSync(coverImagePath)) {
            throw new Error(`Cover image not found: ${coverImagePath}`);
         }

         // In development, save to local storage
         // In production, we'll generate to temp directory then upload to S3
         const isDevelopment = config.NODE_ENV === 'development';
         const tempDir = isDevelopment ? outputDir : path.join(require('os').tmpdir(), `thumbnails-${uniqueSuffix}`);

         // Ensure output directory exists
         if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
         }

         // Generate paths for each thumbnail
         const homeHeroPath = path.join(tempDir, `home-hero-${uniqueSuffix}.jpg`);
         const contentCardPath = path.join(tempDir, `content-card-${uniqueSuffix}.jpg`);
         const chaptersHeroPath = path.join(tempDir, `chapters-hero-${uniqueSuffix}.jpg`);

         // Generate thumbnails in parallel for better performance
         await Promise.all([
            this.generateThumbnail(
               coverImagePath,
               homeHeroPath,
               THUMBNAIL_CONFIGS.homeHero.width,
               THUMBNAIL_CONFIGS.homeHero.height
            ),
            this.generateThumbnail(
               coverImagePath,
               contentCardPath,
               THUMBNAIL_CONFIGS.contentCard.width,
               THUMBNAIL_CONFIGS.contentCard.height
            ),
            this.generateThumbnail(
               coverImagePath,
               chaptersHeroPath,
               THUMBNAIL_CONFIGS.chaptersHero.width,
               THUMBNAIL_CONFIGS.chaptersHero.height
            )
         ]);

         // In production, upload to S3 and clean up temp files
         if (!isDevelopment) {
            const s3BasePath = 'images/audiobooks/thumbnails';
            const homeHeroS3Key = await this.uploadThumbnailToS3(homeHeroPath, `${s3BasePath}/home-hero-${uniqueSuffix}.jpg`);
            const contentCardS3Key = await this.uploadThumbnailToS3(contentCardPath, `${s3BasePath}/content-card-${uniqueSuffix}.jpg`);
            const chaptersHeroS3Key = await this.uploadThumbnailToS3(chaptersHeroPath, `${s3BasePath}/chapters-hero-${uniqueSuffix}.jpg`);

            // Clean up temp files
            this.cleanupTempFiles([homeHeroPath, contentCardPath, chaptersHeroPath, tempDir]);

            return {
               homeHero: homeHeroS3Key,
               contentCard: contentCardS3Key,
               chaptersHero: chaptersHeroS3Key
            };
         }

         // In development, return local file URLs
         return {
            homeHero: this.getFileUrl(homeHeroPath),
            contentCard: this.getFileUrl(contentCardPath),
            chaptersHero: this.getFileUrl(chaptersHeroPath)
         };
      } catch (error: any) {
         // Clean up any partially created files on error
         this.cleanupFailedThumbnails(outputDir, uniqueSuffix);
         throw new Error(`Failed to generate thumbnails: ${error.message}`);
      }
   }

   /**
    * Generate a single thumbnail from a cover image using ffmpeg
    * @param coverImagePath Path to the cover image file
    * @param outputPath Path where the thumbnail will be saved
    * @param width Thumbnail width in pixels
    * @param height Thumbnail height in pixels
    */
   private async generateThumbnail(
      coverImagePath: string,
      outputPath: string,
      width: number,
      height: number
   ): Promise<void> {
      try {
         // Check if cover image exists
         if (!fs.existsSync(coverImagePath)) {
            throw new Error(`Cover image not found: ${coverImagePath}`);
         }

         // Use ffmpeg to resize the cover image to the required dimensions
         const ffmpegPath = resolveFfmpegPath();
         const resizeCommand = `"${ffmpegPath}" -i "${coverImagePath}" -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black" "${outputPath}" -y`;

         await execAsync(resizeCommand, { timeout: 30000 }); // 30 second timeout

         // Verify the thumbnail was created
         if (!fs.existsSync(outputPath)) {
            throw new Error(`Thumbnail generation failed: ${outputPath} was not created`);
         }
      } catch (error: any) {
         throw new Error(`Failed to generate thumbnail at ${outputPath}: ${error.message}`);
      }
   }

   /**
     * Clean up failed thumbnail files
     */
   private cleanupFailedThumbnails(outputDir: string, uniqueSuffix: string): void {
      const patterns = ['home-hero', 'content-card', 'chapters-hero'];
      patterns.forEach(pattern => {
         const filePath = path.join(outputDir, `${pattern}-${uniqueSuffix}.jpg`);
         if (fs.existsSync(filePath)) {
            try {
               fs.unlinkSync(filePath);
            } catch (error) {
               console.error(`Failed to cleanup ${filePath}:`, error);
            }
         }
      });
   }

   /**
    * Generate chapter thumbnails from a cover image using ffmpeg
    * @param coverImagePath Path to the cover image file
    * @param outputDir Directory where thumbnails will be saved (development only)
    * @returns Object containing paths/URLs to the three generated thumbnails
    */
   async generateChapterThumbnails(
      coverImagePath: string,
      outputDir: string
   ): Promise<ChapterThumbnailPaths> {
      // Generate unique prefix for this set of thumbnails
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

      try {
         // Check if cover image exists
         if (!fs.existsSync(coverImagePath)) {
            throw new Error(`Cover image not found: ${coverImagePath}`);
         }

         // In development, save to local storage
         // In production, we'll generate to temp directory then upload to S3
         const isDevelopment = config.NODE_ENV === 'development';
         const tempDir = isDevelopment ? outputDir : path.join(require('os').tmpdir(), `chapter-thumbnails-${uniqueSuffix}`);

         // Ensure output directory exists
         if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
         }

         // Generate paths for each thumbnail
         const chapterCardPath = path.join(tempDir, `chapter-card-${uniqueSuffix}.jpg`);
         const maximizedPath = path.join(tempDir, `maximized-${uniqueSuffix}.jpg`);
         const minimizedPath = path.join(tempDir, `minimized-${uniqueSuffix}.jpg`);

         // Generate thumbnails in parallel for better performance
         await Promise.all([
            this.generateThumbnail(coverImagePath, chapterCardPath, 240, 360),
            this.generateThumbnail(coverImagePath, maximizedPath, 600, 600),
            this.generateThumbnail(coverImagePath, minimizedPath, 150, 150)
         ]);

         // In production, upload to S3 and clean up temp files
         if (!isDevelopment) {
            const s3BasePath = 'uploads/images/chapters/thumbnails';
            const chapterCardS3Key = await this.uploadThumbnailToS3(chapterCardPath, `${s3BasePath}/chapter-card-${uniqueSuffix}.jpg`);
            const maximizedS3Key = await this.uploadThumbnailToS3(maximizedPath, `${s3BasePath}/maximized-${uniqueSuffix}.jpg`);
            const minimizedS3Key = await this.uploadThumbnailToS3(minimizedPath, `${s3BasePath}/minimized-${uniqueSuffix}.jpg`);

            // Clean up temp files
            this.cleanupTempFiles([chapterCardPath, maximizedPath, minimizedPath, tempDir]);

            return {
               chapterCard: chapterCardS3Key,
               maximized: maximizedS3Key,
               minimized: minimizedS3Key
            };
         }

         // In development, return local file URLs
         return {
            chapterCard: this.getFileUrl(chapterCardPath),
            maximized: this.getFileUrl(maximizedPath),
            minimized: this.getFileUrl(minimizedPath)
         };
      } catch (error: any) {
         // Clean up any partially created files on error
         const tempDir = config.NODE_ENV === 'development' ? outputDir : path.join(require('os').tmpdir(), `chapter-thumbnails-${uniqueSuffix}`);
         this.cleanupFailedChapterThumbnails(tempDir, uniqueSuffix);
         throw new Error(`Failed to generate chapter thumbnails: ${error.message}`);
      }
   }

   /**
    * Upload a thumbnail file to S3
    * @param localFilePath Path to the local thumbnail file
    * @param s3Key S3 key/path where the file should be stored
    * @returns S3 key (can be used as URL or path)
    */
   private async uploadThumbnailToS3(localFilePath: string, s3Key: string): Promise<string> {
      try {
         const storageProvider = StorageFactory.getStorageProvider();
         const fileBuffer = fs.readFileSync(localFilePath);
         const contentType = 'image/jpeg';

         // Upload to S3
         await storageProvider.uploadFile(s3Key, fileBuffer, contentType);

         // Return the S3 key (the storage provider may return a full URL, but we'll use the key)
         return s3Key;
      } catch (error: any) {
         throw new Error(`Failed to upload thumbnail to S3: ${error.message}`);
      }
   }

   /**
    * Clean up temporary files and directories
    */
   private cleanupTempFiles(filePaths: string[]): void {
      filePaths.forEach(filePath => {
         try {
            if (fs.existsSync(filePath)) {
               const stats = fs.statSync(filePath);
               if (stats.isDirectory()) {
                  fs.rmSync(filePath, { recursive: true, force: true });
               } else {
                  fs.unlinkSync(filePath);
               }
            }
         } catch (error) {
            console.error(`Failed to cleanup ${filePath}:`, error);
         }
      });
   }

   /**
    * Clean up failed chapter thumbnail files
    */
   private cleanupFailedChapterThumbnails(outputDir: string, uniqueSuffix: string): void {
      const patterns = ['chapter-card', 'maximized', 'minimized'];
      patterns.forEach(pattern => {
         const filePath = path.join(outputDir, `${pattern}-${uniqueSuffix}.jpg`);
         if (fs.existsSync(filePath)) {
            try {
               fs.unlinkSync(filePath);
            } catch (error) {
               console.error(`Failed to cleanup ${filePath}:`, error);
            }
         }
      });
   }

   /**
    * Get file URL for serving the image
    * Similar to getFileUrl in UploadMiddleware
    */
   private getFileUrl(filePath: string): string {
      // In development, serve files from src/uploads
      if (config.NODE_ENV === 'development') {
         return `/uploads${filePath.replace(config.DEV_UPLOAD_DIR, '')}`;
      }
      return filePath;
   }
}

