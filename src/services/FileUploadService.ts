/**
 * File Upload Service
 * Handles file uploads to appropriate storage based on environment
 */
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { StorageFactory } from './storage/StorageFactory';
import { fileUrlService } from './FileUrlService';
import { ApiError } from '../types/ApiError';

export interface FileUploadResult {
   filePath: string;
   fileSize: number;
   originalName: string;
}

export class FileUploadService {
   private storageProvider = StorageFactory.getStorageProvider();

   /**
    * Upload file to appropriate storage based on environment
    */
   async uploadFile(
      uploadedFile: Express.Multer.File,
      relativePath: string
   ): Promise<FileUploadResult> {
      try {
         if (config.NODE_ENV === 'development') {
            return await this.saveToLocalStorage(uploadedFile, relativePath);
         } else {
            return await this.uploadToS3(uploadedFile, relativePath);
         }
      } catch (error: any) {
         // console.error('File upload error:', error);
         throw new ApiError(`Failed to upload file: ${error.message}`, 500);
      }
   }

   /**
    * DB/API paths use /uploads/...; on disk under streaming-service storage they live without the uploads/ prefix.
    */
   private toLocalStorageKey(filePath: string): string {
      return filePath.replace(/^\/+/, '').replace(/^uploads\//, '');
   }

   private toDbFilePath(relativePath: string, filename: string): string {
      const dir = relativePath.replace(/^\/+/, '').replace(/\/+$/, '');
      const withUploads = dir.startsWith('uploads/') ? dir : `uploads/${dir}`;
      return `/${withUploads}/${filename}`.replace(/\\/g, '/');
   }

   private buildStoragePaths(
      relativePath: string,
      filename: string,
   ): { dbFilePath: string; s3Key: string } {
      const dbFilePath = this.toDbFilePath(relativePath, filename);
      const s3Key = fileUrlService.normalizeToS3Key(dbFilePath);

      if (!s3Key) {
         throw new Error('Unable to derive S3 key for upload');
      }

      return { dbFilePath, s3Key };
   }

   private toS3StorageKey(filePath: string): string | null {
      return fileUrlService.normalizeToS3Key(filePath);
   }

   private resolveLocalFullPath(filePath: string): string {
      return path.join(config.STREAMING_SERVICE_STORAGE_PATH, this.toLocalStorageKey(filePath));
   }

   /**
    * Save file to local storage (development environment)
    */
   private async saveToLocalStorage(
      uploadedFile: Express.Multer.File,
      relativePath: string
   ): Promise<FileUploadResult> {
      try {
         // Generate unique filename with timestamp
         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
         const ext = path.extname(uploadedFile.originalname);
         const filename = `audio-${uniqueSuffix}${ext}`;

         const storageSubdir = this.toLocalStorageKey(relativePath);
         const fullPath = path.join(config.STREAMING_SERVICE_STORAGE_PATH, storageSubdir, filename);

         // Ensure directory exists
         const dir = path.dirname(fullPath);
         if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
         }

         // Move file from multer's temporary location to our desired location
         // uploadedFile.path contains the temporary file path when using diskStorage
         if (uploadedFile.path) {
            fs.copyFileSync(uploadedFile.path, fullPath);
            // Clean up the temporary file
            fs.unlinkSync(uploadedFile.path);
         } else if (uploadedFile.buffer) {
            // Fallback for memory storage
            fs.writeFileSync(fullPath, uploadedFile.buffer);
         } else {
            throw new Error('No file data available (neither path nor buffer)');
         }

         console.log(`File saved to local storage: ${fullPath}`);

         return {
            filePath: this.toDbFilePath(relativePath, filename),
            fileSize: uploadedFile.size,
            originalName: uploadedFile.originalname
         };
      } catch (error: any) {
         // console.error('Local storage save error:', error);
         throw new ApiError(`Failed to save file to local storage: ${error.message}`, 500);
      }
   }

   /**
    * Upload file to S3 (production environment)
    */
   private async uploadToS3(
      uploadedFile: Express.Multer.File,
      relativePath: string
   ): Promise<FileUploadResult> {
      try {
         // Generate unique filename with timestamp
         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
         const ext = path.extname(uploadedFile.originalname);
         const filename = `audio-${uniqueSuffix}${ext}`;
         const { dbFilePath, s3Key } = this.buildStoragePaths(relativePath, filename);

         // Get file buffer from either path or buffer
         let fileBuffer: Buffer;
         if (uploadedFile.path) {
            // Read file from disk when using diskStorage
            fileBuffer = fs.readFileSync(uploadedFile.path);
            // Clean up the temporary file
            fs.unlinkSync(uploadedFile.path);
         } else if (uploadedFile.buffer) {
            // Use buffer when using memoryStorage
            fileBuffer = uploadedFile.buffer;
         } else {
            throw new Error('No file data available (neither path nor buffer)');
         }

         // Upload to S3
         const s3Url = await this.storageProvider.uploadFile(
            s3Key,
            fileBuffer,
            uploadedFile.mimetype,
            {
               originalName: uploadedFile.originalname,
               uploadedAt: new Date().toISOString()
            }
         );

         console.log(`File uploaded to S3: ${s3Url}`);

         return {
            filePath: dbFilePath,
            fileSize: uploadedFile.size,
            originalName: uploadedFile.originalname
         };
      } catch (error: any) {
         // console.error('S3 upload error:', error);
         throw new ApiError(`Failed to upload file to S3: ${error.message}`, 500);
      }
   }

   /**
    * Delete file from storage
    */
   async deleteFile(filePath: string): Promise<boolean> {
      try {
         if (config.NODE_ENV === 'development') {
            return this.deleteFromLocalStorage(filePath);
         } else {
            const s3Key = this.toS3StorageKey(filePath);
            if (!s3Key) {
               return false;
            }
            return await this.storageProvider.deleteFile(s3Key);
         }
      } catch (_error: any) {
         // console.error('File deletion error:', _error);
         return false;
      }
   }

   /**
    * Delete file from local storage
    */
   private deleteFromLocalStorage(filePath: string): boolean {
      try {
         const fullPath = this.resolveLocalFullPath(filePath);

         if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`File deleted from local storage: ${fullPath}`);
            return true;
         }

         return false;
      } catch (_error: any) {
         // console.error('Local storage deletion error:', _error);
         return false;
      }
   }

   /**
    * Check if file exists in storage
    */
   async fileExists(filePath: string): Promise<boolean> {
      try {
         if (config.NODE_ENV === 'development') {
            const fullPath = this.resolveLocalFullPath(filePath);
            return fs.existsSync(fullPath);
         } else {
            const s3Key = this.toS3StorageKey(filePath);
            if (!s3Key) {
               return false;
            }
            return await this.storageProvider.fileExists(s3Key);
         }
      } catch (_error: any) {
         // console.error('File existence check error:', _error);
         return false;
      }
   }

   /**
    * Get file metadata
    */
   async getFileMetadata(filePath: string): Promise<{
      size: number;
      lastModified: Date;
      contentType?: string;
   } | null> {
      try {
         if (config.NODE_ENV === 'development') {
            const fullPath = this.resolveLocalFullPath(filePath);

            if (!fs.existsSync(fullPath)) {
               return null;
            }

            const stats = fs.statSync(fullPath);
            return {
               size: stats.size,
               lastModified: stats.mtime,
               contentType: 'audio/mpeg' // Default for audio files
            };
         } else {
            const s3Key = this.toS3StorageKey(filePath);
            if (!s3Key) {
               return null;
            }
            return await this.storageProvider.getFileMetadata(s3Key);
         }
      } catch (_error: any) {
         // console.error('File metadata retrieval error:', _error);
         return null;
      }
   }
}
