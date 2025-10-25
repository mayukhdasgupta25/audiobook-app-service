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
   startPosition: number;
   endPosition: number;
   createdAt: Date;
   updatedAt: Date;
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
   startPosition: number;
   endPosition: number;
}

// Chapter update request
export interface UpdateChapterRequest {
   title?: string;
   description?: string;
   chapterNumber?: number;
   duration?: number;
   filePath?: string;
   fileSize?: number;
   startPosition?: number;
   endPosition?: number;
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
