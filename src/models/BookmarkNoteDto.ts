/**
 * Bookmark and Note Data Transfer Objects
 * Defines the structure for bookmark and note functionality
 */

// Base Bookmark interface
export interface BookmarkData {
   id: string;
   userProfileId: string;
   audiobookId?: string;
   chapterId?: string;
   title?: string;
   description?: string;
   position: number; // Position in seconds
   timestamp: Date;
   createdAt: Date;
   updatedAt: Date;
}

// Bookmark with relations
export interface BookmarkWithRelations extends BookmarkData {
   audiobook?: {
      id: string;
      title: string;
      author: string;
   };
   chapter?: {
      id: string;
      title: string;
      chapterNumber: number;
   };
}

// Bookmark creation request
export interface CreateBookmarkRequest {
   audiobookId?: string;
   chapterId?: string;
   title?: string;
   description?: string;
   position: number;
}

// Bookmark update request
export interface UpdateBookmarkRequest {
   title?: string;
   description?: string;
   position?: number;
}

// Base Note interface
export interface NoteData {
   id: string;
   userProfileId: string;
   audiobookId?: string;
   chapterId?: string;
   title?: string;
   content: string;
   position?: number; // Position in seconds (optional)
   timestamp: Date;
   createdAt: Date;
   updatedAt: Date;
}

// Note with relations
export interface NoteWithRelations extends NoteData {
   audiobook?: {
      id: string;
      title: string;
      author: string;
   };
   chapter?: {
      id: string;
      title: string;
      chapterNumber: number;
   };
}

// Note creation request
export interface CreateNoteRequest {
   audiobookId?: string;
   chapterId?: string;
   title?: string;
   content: string;
   position?: number;
}

// Note update request
export interface UpdateNoteRequest {
   title?: string;
   content?: string;
   position?: number;
}

// Bookmark and Note query parameters
export interface BookmarkNoteQueryParams {
   audiobookId?: string;
   chapterId?: string;
   page?: number;
   limit?: number;
   sortBy?: string;
   sortOrder?: 'asc' | 'desc';
   search?: string; // For searching in title/content
}

// Combined bookmark and note response
export interface BookmarkNoteResponse {
   bookmarks: BookmarkWithRelations[];
   notes: NoteWithRelations[];
   totalBookmarks: number;
   totalNotes: number;
}

// Bookmark/Note statistics
export interface BookmarkNoteStats {
   totalBookmarks: number;
   totalNotes: number;
   bookmarksByAudiobook: Array<{
      audiobookId: string;
      audiobookTitle: string;
      count: number;
   }>;
   notesByAudiobook: Array<{
      audiobookId: string;
      audiobookTitle: string;
      count: number;
   }>;
}
