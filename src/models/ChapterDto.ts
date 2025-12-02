/**
 * Chapter Data Transfer Objects
 * Defines the structure for chapter-related data transfer
 */

import { ChapterProgress, Bookmark, Note } from '@prisma/client';

// Base Chapter interface
export interface ChapterData {
   id: string;
   audiobookId: string;
   title: string;
   description?: string;
   chapterNumber: number;
   duration: number;
   filePath: string;
   fileSize: number;
   coverImage: string; // Required
   chapterCardCoverImage?: string; // URL to chapter card cover image (240×360px, 2:3 aspect ratio)
   maximizedChapterCoverImage?: string; // URL to maximized player cover image (600×600px, 1:1 aspect ratio)
   minimizedChapterCoverImage?: string; // URL to minimized player cover image (150×150px, 1:1 aspect ratio)
   startPosition: number;
   endPosition: number;
   isActive: boolean;
   createdAt: Date;
   updatedAt: Date;
   scheduledAt?: Date | null;
}

// Chapter with relations
export interface ChapterWithRelations extends ChapterData {
   audiobook?: {
      id: string;
      title: string;
      author: string;
   };
   chapterProgress?: ChapterProgress[];
   bookmarks?: Bookmark[];
   notes?: Note[];
}

// Chapter creation request
export interface CreateChapterRequest {
   audiobookId: string;
   title: string;
   description?: string;
   chapterNumber: number;
   duration: number;
   filePath?: string; // Made optional for file uploads
   fileSize?: number; // Made optional for file uploads
   coverImage?: string; // Optional in request, will be set from uploaded file
   chapterCardCoverImage?: string; // Optional, auto-generated from coverImage
   maximizedChapterCoverImage?: string; // Optional, auto-generated from coverImage
   minimizedChapterCoverImage?: string; // Optional, auto-generated from coverImage
   startPosition: number;
   endPosition: number;
   isActive?: boolean;
   scheduledAt?: Date;
}

// Chapter update request
export interface UpdateChapterRequest {
   title?: string;
   description?: string;
   chapterNumber?: number;
   duration?: number;
   filePath?: string;
   fileSize?: number;
   coverImage?: string;
   chapterCardCoverImage?: string; // Optional, auto-generated from coverImage if coverImage is updated
   maximizedChapterCoverImage?: string; // Optional, auto-generated from coverImage if coverImage is updated
   minimizedChapterCoverImage?: string; // Optional, auto-generated from coverImage if coverImage is updated
   startPosition?: number;
   endPosition?: number;
   isActive?: boolean;
   scheduledAt?: Date;
}

// Chapter progress tracking
export interface ChapterProgressData {
   id: string;
   userProfileId: string;
   chapterId: string;
   currentPosition: number;
   completed: boolean;
   lastListenedAt: Date;
   createdAt: Date;
   updatedAt: Date;
}

// Chapter progress update request
export interface UpdateChapterProgressRequest {
   currentPosition: number;
   completed?: boolean;
}

// Chapter query parameters
export interface ChapterQueryParams {
   audiobookId?: string;
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: 'asc' | 'desc';
}

// Chapter response with progress
export interface ChapterWithProgress extends ChapterData {
   userProgress?: ChapterProgressData;
   overallProgress?: number; // Percentage completed
}

// Chapter navigation data
export interface ChapterNavigation {
   currentChapter: ChapterWithProgress;
   previousChapter?: ChapterWithProgress;
   nextChapter?: ChapterWithProgress;
   totalChapters: number;
   currentChapterIndex: number;
}
