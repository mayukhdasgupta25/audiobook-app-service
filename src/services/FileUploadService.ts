/**
 * File Upload Service
 * Handles file uploads to appropriate storage based on environment
 */
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { StorageFactory } from './storage/StorageFactory';
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
         console.error('File upload error:', error);
         throw new ApiError(`Failed to upload file: ${error.message}`, 500);
      }
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

         // Construct full path
         const fullPath = path.join(config.STREAMING_SERVICE_STORAGE_PATH, relativePath, filename);

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
            filePath: path.join(relativePath, filename).replace(/\\/g, '/'), // Use forward slashes for consistency
            fileSize: uploadedFile.size,
            originalName: uploadedFile.originalname
         };
      } catch (error: any) {
         console.error('Local storage save error:', error);
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

         // Construct S3 key
         const s3Key = path.join(relativePath, filename).replace(/\\/g, '/');

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
            filePath: s3Key,
            fileSize: uploadedFile.size,
            originalName: uploadedFile.originalname
         };
      } catch (error: any) {
         console.error('S3 upload error:', error);
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
            return await this.storageProvider.deleteFile(filePath);
         }
      } catch (error: any) {
         console.error('File deletion error:', error);
         return false;
      }
   }

   /**
    * Delete file from local storage
    */
   private deleteFromLocalStorage(filePath: string): boolean {
      try {
         const fullPath = path.join(config.STREAMING_SERVICE_STORAGE_PATH, filePath);

         if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`File deleted from local storage: ${fullPath}`);
            return true;
         }

         return false;
      } catch (error: any) {
         console.error('Local storage deletion error:', error);
         return false;
      }
   }

   /**
    * Check if file exists in storage
    */
   async fileExists(filePath: string): Promise<boolean> {
      try {
         if (config.NODE_ENV === 'development') {
            const fullPath = path.join(config.STREAMING_SERVICE_STORAGE_PATH, filePath);
            return fs.existsSync(fullPath);
         } else {
            return await this.storageProvider.fileExists(filePath);
         }
      } catch (error: any) {
         console.error('File existence check error:', error);
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
            const fullPath = path.join(config.STREAMING_SERVICE_STORAGE_PATH, filePath);

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
            return await this.storageProvider.getFileMetadata(filePath);
         }
      } catch (error: any) {
         console.error('File metadata retrieval error:', error);
         return null;
      }
   }
}
