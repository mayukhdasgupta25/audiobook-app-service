/**
 * Image Validation Utility
 * Validates image dimensions and aspect ratios
 */
import sizeOf from 'image-size';
import { ApiError } from '../types/ApiError';
import fs from 'fs';

export interface ImageDimensions {
   width: number;
   height: number;
}

export interface ImageValidationResult {
   isValid: boolean;
   error?: string;
   dimensions?: ImageDimensions;
}

/**
 * Validate cover image dimensions and aspect ratio
 * Requirements:
 * - Minimum dimensions: 2568x3600 pixels
 * - Aspect ratio: 5:7 (approximately 0.714)
 * - Allow higher resolutions maintaining the aspect ratio
 */
export function validateCoverImageDimensions(filePath: string): ImageValidationResult {
   try {
      // Read file as buffer for image-size library
      const imageBuffer = fs.readFileSync(filePath);
      const dimensions = sizeOf(imageBuffer);

      console.log(dimensions);
      if (!dimensions.width || !dimensions.height) {
         return {
            isValid: false,
            error: 'Unable to read image dimensions'
         };
      }

      const width = dimensions.width;
      const height = dimensions.height;

      // Minimum dimensions: 2568x3600
      const MIN_WIDTH = 2568;
      const MIN_HEIGHT = 3600;

      if (width < MIN_WIDTH) {
         return {
            isValid: false,
            error: `Image width must be at least ${MIN_WIDTH} pixels. Current width: ${width}px`
         };
      }

      if (height < MIN_HEIGHT) {
         return {
            isValid: false,
            error: `Image height must be at least ${MIN_HEIGHT} pixels. Current height: ${height}px`
         };
      }

      // Validate aspect ratio: 5:7 = 0.714285...
      // Allow tolerance of ±2% for aspect ratio
      const TARGET_ASPECT_RATIO = 5 / 7; // 0.714285...
      const TOLERANCE = 0.02; // 2% tolerance
      const actualAspectRatio = width / height;
      const aspectRatioDifference = Math.abs(actualAspectRatio - TARGET_ASPECT_RATIO);

      if (aspectRatioDifference > TOLERANCE) {
         return {
            isValid: false,
            error: `Image aspect ratio must be 5:7 (approximately 0.714). Current aspect ratio: ${actualAspectRatio.toFixed(3)} (${width}x${height})`
         };
      }

      return {
         isValid: true,
         dimensions: { width, height }
      };
   } catch (error: any) {
      return {
         isValid: false,
         error: `Failed to validate image: ${error.message}`
      };
   }
}

/**
 * Validate cover image and throw ApiError if invalid
 */
export function validateCoverImageOrThrow(filePath: string): ImageDimensions {
   const validation = validateCoverImageDimensions(filePath);

   if (!validation.isValid) {
      throw ApiError.validationError(validation.error || 'Invalid cover image dimensions');
   }

   return validation.dimensions!;
}

/**
 * Validate chapter cover image dimensions and aspect ratio
 * Requirements:
 * - Minimum dimensions: 1200x1200 pixels
 * - Aspect ratio: 1:1 (square)
 * - Allow higher resolutions maintaining the aspect ratio
 */
export function validateChapterCoverImageDimensions(filePath: string): ImageValidationResult {
   try {
      // Read file as buffer for image-size library
      const imageBuffer = fs.readFileSync(filePath);
      const dimensions = sizeOf(imageBuffer);

      if (!dimensions.width || !dimensions.height) {
         return {
            isValid: false,
            error: 'Unable to read image dimensions'
         };
      }

      const width = dimensions.width;
      const height = dimensions.height;

      // Minimum dimensions: 1200x1200
      const MIN_WIDTH = 1200;
      const MIN_HEIGHT = 1200;

      if (width < MIN_WIDTH) {
         return {
            isValid: false,
            error: `Image width must be at least ${MIN_WIDTH} pixels. Current width: ${width}px`
         };
      }

      if (height < MIN_HEIGHT) {
         return {
            isValid: false,
            error: `Image height must be at least ${MIN_HEIGHT} pixels. Current height: ${height}px`
         };
      }

      // Validate aspect ratio: 1:1 = 1.0
      // Allow tolerance of ±2% for aspect ratio
      const TARGET_ASPECT_RATIO = 1.0;
      const TOLERANCE = 0.02; // 2% tolerance
      const actualAspectRatio = width / height;
      const aspectRatioDifference = Math.abs(actualAspectRatio - TARGET_ASPECT_RATIO);

      if (aspectRatioDifference > TOLERANCE) {
         return {
            isValid: false,
            error: `Image aspect ratio must be 1:1 (square). Current aspect ratio: ${actualAspectRatio.toFixed(3)} (${width}x${height})`
         };
      }

      return {
         isValid: true,
         dimensions: { width, height }
      };
   } catch (error: any) {
      return {
         isValid: false,
         error: `Failed to validate image: ${error.message}`
      };
   }
}

/**
 * Validate chapter cover image and throw ApiError if invalid
 */
export function validateChapterCoverImageOrThrow(filePath: string): ImageDimensions {
   const validation = validateChapterCoverImageDimensions(filePath);

   if (!validation.isValid) {
      throw ApiError.validationError(validation.error || 'Invalid chapter cover image dimensions');
   }

   return validation.dimensions!;
}

