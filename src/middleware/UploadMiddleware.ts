/**
 * Upload Middleware
 * Handles file uploads with multer for images and audio files
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

// Ensure upload directories exist
const ensureUploadDirs = (): void => {
   const dirs = [
      config.DEV_UPLOAD_DIR,
      config.DEV_IMAGE_DIR,
      config.DEV_AUDIO_DIR
   ];

   dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir, { recursive: true });
      }
   });
};

// Initialize directories
ensureUploadDirs();

// Storage configuration for images
const imageStorage = multer.diskStorage({
   destination: (_req, _file, cb) => {
      cb(null, config.DEV_IMAGE_DIR);
   },
   filename: (_req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `image-${uniqueSuffix}${ext}`);
   }
});

// Storage configuration for audio files
const audioStorage = multer.diskStorage({
   destination: (_req, _file, cb) => {
      cb(null, config.DEV_AUDIO_DIR);
   },
   filename: (_req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `audio-${uniqueSuffix}${ext}`);
   }
});

// File filter for images
const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
   const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
   ];

   if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
   } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
   }
};

// File filter for audio files
const audioFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
   const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/aac',
      'audio/flac'
   ];

   if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
   } else {
      cb(new Error('Only audio files (MP3, WAV, OGG, M4A, AAC, FLAC) are allowed'));
   }
};

// Multer configurations
const imageUpload = multer({
   storage: imageStorage,
   fileFilter: imageFilter,
   limits: {
      fileSize: config.MAX_FILE_SIZE, // 50MB default
      files: 1 // Single file upload
   }
});

const audioUpload = multer({
   storage: audioStorage,
   fileFilter: audioFilter,
   limits: {
      fileSize: config.MAX_FILE_SIZE * 10, // 500MB for audio files
      files: 1 // Single file upload
   }
});

// Error handling middleware
export const handleUploadError = (_error: any, _req: Request, res: Response, next: NextFunction): void => {
   if (_error instanceof multer.MulterError) {
      if (_error.code === 'LIMIT_FILE_SIZE') {
         res.status(400).json({
            success: false,
            message: 'File too large. Maximum size allowed is 50MB for images and 500MB for audio files.',
            error: 'FILE_TOO_LARGE'
         });
         return;
      }
      if (_error.code === 'LIMIT_FILE_COUNT') {
         res.status(400).json({
            success: false,
            message: 'Too many files. Only one file allowed per upload.',
            error: 'TOO_MANY_FILES'
         });
         return;
      }
   }

   if (_error.message.includes('Only')) {
      res.status(400).json({
         success: false,
         message: _error.message,
         error: 'INVALID_FILE_TYPE'
      });
      return;
   }

   next(_error);
};

// Middleware for single image upload
export const uploadSingleImage = imageUpload.single('image');

// Middleware for single audio upload
export const uploadSingleAudio = audioUpload.single('audio');

// Middleware for multiple image uploads
export const uploadMultipleImages = imageUpload.array('images', 5);

// Middleware for multiple audio uploads
export const uploadMultipleAudio = audioUpload.array('audio', 3);

// Utility function to get file URL
export const getFileUrl = (filePath: string): string => {
   // In development, serve files from src/uploads
   if (config.NODE_ENV === 'development') {
      return `/uploads${filePath.replace(config.DEV_UPLOAD_DIR, '')}`;
   }
   return filePath;
};

// Utility function to delete file
export const deleteFile = (filePath: string): boolean => {
   try {
      if (fs.existsSync(filePath)) {
         fs.unlinkSync(filePath);
         return true;
      }
      return false;
   } catch (error) {
      console.error('Error deleting file:', error);
      return false;
   }
};

export class UploadMiddleware {
   // Static method to handle image uploads
   static handleImageUpload = (req: Request, res: Response, next: NextFunction): void => {
      uploadSingleImage(req, res, (err) => {
         if (err) {
            return handleUploadError(err, req, res, next);
         }
         next();
      });
   };

   // Static method to handle audio uploads
   static handleAudioUpload = (req: Request, res: Response, next: NextFunction): void => {
      uploadSingleAudio(req, res, (err) => {
         if (err) {
            return handleUploadError(err, req, res, next);
         }
         next();
      });
   };

   // Static method to handle multiple image uploads
   static handleMultipleImages = (req: Request, res: Response, next: NextFunction): void => {
      uploadMultipleImages(req, res, (err) => {
         if (err) {
            return handleUploadError(err, req, res, next);
         }
         next();
      });
   };

   // Static method to handle multiple audio uploads
   static handleMultipleAudio = (req: Request, res: Response, next: NextFunction): void => {
      uploadMultipleAudio(req, res, (err) => {
         if (err) {
            return handleUploadError(err, req, res, next);
         }
         next();
      });
   };
}
