/**
 * Bookmark Service
 * Handles bookmark and note management functionality
 */
import { PrismaClient } from '@prisma/client';
import {
   BookmarkData,
   BookmarkWithRelations,
   CreateBookmarkRequest,
   UpdateBookmarkRequest,
   NoteData,
   NoteWithRelations,
   CreateNoteRequest,
   UpdateNoteRequest,
   BookmarkNoteQueryParams,
   BookmarkNoteResponse,
   BookmarkNoteStats
} from '../models/BookmarkNoteDto';
import { ApiError } from '../types/ApiError';

export class BookmarkService {
   constructor(private prisma: PrismaClient) { }

   /**
    * Create a new bookmark
    */
   async createBookmark(userProfileId: string, bookmarkData: CreateBookmarkRequest): Promise<BookmarkData> {
      try {
         // Validate that either audiobookId or chapterId is provided
         if (!bookmarkData.audiobookId && !bookmarkData.chapterId) {
            throw new ApiError('Either audiobookId or chapterId must be provided', 400);
         }

         // Validate audiobook exists if provided
         if (bookmarkData.audiobookId) {
            const audiobook = await this.prisma.audioBook.findUnique({
               where: { id: bookmarkData.audiobookId },
            });
            if (!audiobook) {
               throw new ApiError('Audiobook not found', 404);
            }
         }

         // Validate chapter exists if provided
         if (bookmarkData.chapterId) {
            const chapter = await this.prisma.chapter.findUnique({
               where: { id: bookmarkData.chapterId },
            });
            if (!chapter) {
               throw new ApiError('Chapter not found', 404);
            }
         }

         const bookmark = await this.prisma.bookmark.create({
            data: {
               userProfileId,
               ...bookmarkData,
            },
         });

         return {
            id: bookmark.id,
            userProfileId: bookmark.userProfileId,
            audiobookId: bookmark.audiobookId || undefined,
            chapterId: bookmark.chapterId || undefined,
            title: bookmark.title || undefined,
            description: bookmark.description || undefined,
            position: bookmark.position,
            timestamp: bookmark.timestamp,
            createdAt: bookmark.createdAt,
            updatedAt: bookmark.updatedAt
         } as BookmarkData;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to create bookmark', 500);
      }
   }

   /**
    * Get bookmarks for a user
    */
   async getBookmarks(userProfileId: string, queryParams?: BookmarkNoteQueryParams): Promise<{
      bookmarks: BookmarkWithRelations[];
      totalCount: number;
   }> {
      try {
         const {
            audiobookId,
            chapterId,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search
         } = queryParams || {};

         const skip = (page - 1) * limit;
         const whereClause: any = { userProfileId };

         if (audiobookId) {
            whereClause.audiobookId = audiobookId;
         }
         if (chapterId) {
            whereClause.chapterId = chapterId;
         }
         if (search) {
            whereClause.OR = [
               { title: { contains: search, mode: 'insensitive' } },
               { description: { contains: search, mode: 'insensitive' } },
            ];
         }

         const [bookmarks, totalCount] = await Promise.all([
            this.prisma.bookmark.findMany({
               where: whereClause,
               include: {
                  audiobook: {
                     select: {
                        id: true,
                        title: true,
                        author: true,
                     },
                  },
                  chapter: {
                     select: {
                        id: true,
                        title: true,
                        chapterNumber: true,
                     },
                  },
               },
               orderBy: { [sortBy]: sortOrder },
               skip,
               take: limit,
            }),
            this.prisma.bookmark.count({
               where: whereClause,
            }),
         ]);

         return {
            bookmarks: bookmarks.map(bookmark => ({
               id: bookmark.id,
               userProfileId: bookmark.userProfileId,
               audiobookId: bookmark.audiobookId || undefined,
               chapterId: bookmark.chapterId || undefined,
               title: bookmark.title || undefined,
               description: bookmark.description || undefined,
               position: bookmark.position,
               timestamp: bookmark.timestamp,
               createdAt: bookmark.createdAt,
               updatedAt: bookmark.updatedAt
            } as BookmarkWithRelations)),
            totalCount
         };
      } catch (_error) {
         throw new ApiError('Failed to retrieve bookmarks', 500);
      }
   }

   /**
    * Get a specific bookmark by ID
    */
   async getBookmarkById(userProfileId: string, bookmarkId: string): Promise<BookmarkWithRelations> {
      try {
         const bookmark = await this.prisma.bookmark.findFirst({
            where: {
               id: bookmarkId,
               userProfileId,
            },
            include: {
               audiobook: {
                  select: {
                     id: true,
                     title: true,
                     author: true,
                  },
               },
               chapter: {
                  select: {
                     id: true,
                     title: true,
                     chapterNumber: true,
                  },
               },
            },
         });

         if (!bookmark) {
            throw new ApiError('Bookmark not found', 404);
         }

         return {
            id: bookmark.id,
            userProfileId: bookmark.userProfileId,
            audiobookId: bookmark.audiobookId || undefined,
            chapterId: bookmark.chapterId || undefined,
            title: bookmark.title || undefined,
            description: bookmark.description || undefined,
            position: bookmark.position,
            timestamp: bookmark.timestamp,
            createdAt: bookmark.createdAt,
            updatedAt: bookmark.updatedAt
         } as BookmarkData;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to retrieve bookmark', 500);
      }
   }

   /**
    * Update a bookmark
    */
   async updateBookmark(userProfileId: string, bookmarkId: string, updateData: UpdateBookmarkRequest): Promise<BookmarkData> {
      try {
         const existingBookmark = await this.prisma.bookmark.findFirst({
            where: {
               id: bookmarkId,
               userProfileId,
            },
         });

         if (!existingBookmark) {
            throw new ApiError('Bookmark not found', 404);
         }

         const bookmark = await this.prisma.bookmark.update({
            where: { id: bookmarkId },
            data: updateData,
         });

         return {
            id: bookmark.id,
            userProfileId: bookmark.userProfileId,
            audiobookId: bookmark.audiobookId || undefined,
            chapterId: bookmark.chapterId || undefined,
            title: bookmark.title || undefined,
            description: bookmark.description || undefined,
            position: bookmark.position,
            timestamp: bookmark.timestamp,
            createdAt: bookmark.createdAt,
            updatedAt: bookmark.updatedAt
         } as BookmarkData;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to update bookmark', 500);
      }
   }

   /**
    * Delete a bookmark
    */
   async deleteBookmark(userProfileId: string, bookmarkId: string): Promise<void> {
      try {
         const bookmark = await this.prisma.bookmark.findFirst({
            where: {
               id: bookmarkId,
               userProfileId,
            },
         });

         if (!bookmark) {
            throw new ApiError('Bookmark not found', 404);
         }

         await this.prisma.bookmark.delete({
            where: { id: bookmarkId },
         });
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to delete bookmark', 500);
      }
   }

   /**
    * Create a new note
    */
   async createNote(userProfileId: string, noteData: CreateNoteRequest): Promise<NoteData> {
      try {
         // Validate that either audiobookId or chapterId is provided
         if (!noteData.audiobookId && !noteData.chapterId) {
            throw new ApiError('Either audiobookId or chapterId must be provided', 400);
         }

         // Validate audiobook exists if provided
         if (noteData.audiobookId) {
            const audiobook = await this.prisma.audioBook.findUnique({
               where: { id: noteData.audiobookId },
            });
            if (!audiobook) {
               throw new ApiError('Audiobook not found', 404);
            }
         }

         // Validate chapter exists if provided
         if (noteData.chapterId) {
            const chapter = await this.prisma.chapter.findUnique({
               where: { id: noteData.chapterId },
            });
            if (!chapter) {
               throw new ApiError('Chapter not found', 404);
            }
         }

         const note = await this.prisma.note.create({
            data: {
               userProfileId,
               ...noteData,
            },
         });

         return {
            id: note.id,
            userProfileId: note.userProfileId,
            audiobookId: note.audiobookId || undefined,
            chapterId: note.chapterId || undefined,
            title: note.title || undefined,
            content: note.content,
            position: note.position || undefined,
            timestamp: note.timestamp,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
         } as NoteData;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to create note', 500);
      }
   }

   /**
    * Get notes for a user
    */
   async getNotes(userProfileId: string, queryParams?: BookmarkNoteQueryParams): Promise<{
      notes: NoteWithRelations[];
      totalCount: number;
   }> {
      try {
         const {
            audiobookId,
            chapterId,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search
         } = queryParams || {};

         const skip = (page - 1) * limit;
         const whereClause: any = { userProfileId };

         if (audiobookId) {
            whereClause.audiobookId = audiobookId;
         }
         if (chapterId) {
            whereClause.chapterId = chapterId;
         }
         if (search) {
            whereClause.OR = [
               { title: { contains: search, mode: 'insensitive' } },
               { content: { contains: search, mode: 'insensitive' } },
            ];
         }

         const [notes, totalCount] = await Promise.all([
            this.prisma.note.findMany({
               where: whereClause,
               include: {
                  audiobook: {
                     select: {
                        id: true,
                        title: true,
                        author: true,
                     },
                  },
                  chapter: {
                     select: {
                        id: true,
                        title: true,
                        chapterNumber: true,
                     },
                  },
               },
               orderBy: { [sortBy]: sortOrder },
               skip,
               take: limit,
            }),
            this.prisma.note.count({
               where: whereClause,
            }),
         ]);

         return {
            notes: notes.map(note => ({
               id: note.id,
               userProfileId: note.userProfileId,
               audiobookId: note.audiobookId || undefined,
               chapterId: note.chapterId || undefined,
               title: note.title || undefined,
               content: note.content,
               position: note.position || undefined,
               timestamp: note.timestamp,
               createdAt: note.createdAt,
               updatedAt: note.updatedAt
            } as NoteWithRelations)),
            totalCount
         };
      } catch (_error) {
         throw new ApiError('Failed to retrieve notes', 500);
      }
   }

   /**
    * Get a specific note by ID
    */
   async getNoteById(userProfileId: string, noteId: string): Promise<NoteWithRelations> {
      try {
         const note = await this.prisma.note.findFirst({
            where: {
               id: noteId,
               userProfileId,
            },
            include: {
               audiobook: {
                  select: {
                     id: true,
                     title: true,
                     author: true,
                  },
               },
               chapter: {
                  select: {
                     id: true,
                     title: true,
                     chapterNumber: true,
                  },
               },
            },
         });

         if (!note) {
            throw new ApiError('Note not found', 404);
         }

         return {
            id: note.id,
            userProfileId: note.userProfileId,
            audiobookId: note.audiobookId || undefined,
            chapterId: note.chapterId || undefined,
            title: note.title || undefined,
            content: note.content,
            position: note.position || undefined,
            timestamp: note.timestamp,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
         } as NoteData;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to retrieve note', 500);
      }
   }

   /**
    * Update a note
    */
   async updateNote(userProfileId: string, noteId: string, updateData: UpdateNoteRequest): Promise<NoteData> {
      try {
         const existingNote = await this.prisma.note.findFirst({
            where: {
               id: noteId,
               userProfileId,
            },
         });

         if (!existingNote) {
            throw new ApiError('Note not found', 404);
         }

         const note = await this.prisma.note.update({
            where: { id: noteId },
            data: updateData,
         });

         return {
            id: note.id,
            userProfileId: note.userProfileId,
            audiobookId: note.audiobookId || undefined,
            chapterId: note.chapterId || undefined,
            title: note.title || undefined,
            content: note.content,
            position: note.position || undefined,
            timestamp: note.timestamp,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
         } as NoteData;
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to update note', 500);
      }
   }

   /**
    * Delete a note
    */
   async deleteNote(userProfileId: string, noteId: string): Promise<void> {
      try {
         const note = await this.prisma.note.findFirst({
            where: {
               id: noteId,
               userProfileId,
            },
         });

         if (!note) {
            throw new ApiError('Note not found', 404);
         }

         await this.prisma.note.delete({
            where: { id: noteId },
         });
      } catch (error) {
         if (error instanceof ApiError) {
            throw error;
         }
         throw new ApiError('Failed to delete note', 500);
      }
   }

   /**
    * Get combined bookmarks and notes for a user
    */
   async getBookmarksAndNotes(userProfileId: string, queryParams?: BookmarkNoteQueryParams): Promise<BookmarkNoteResponse> {
      try {
         const [bookmarksResult, notesResult] = await Promise.all([
            this.getBookmarks(userProfileId, queryParams),
            this.getNotes(userProfileId, queryParams),
         ]);

         return {
            bookmarks: bookmarksResult.bookmarks,
            notes: notesResult.notes,
            totalBookmarks: bookmarksResult.totalCount,
            totalNotes: notesResult.totalCount,
         };
      } catch (_error) {
         throw new ApiError('Failed to retrieve bookmarks and notes', 500);
      }
   }

   /**
    * Get bookmark and note statistics for a user
    */
   async getBookmarkNoteStats(userProfileId: string): Promise<BookmarkNoteStats> {
      try {
         const [totalBookmarks, totalNotes, bookmarksByAudiobook, notesByAudiobook] = await Promise.all([
            this.prisma.bookmark.count({
               where: { userProfileId },
            }),
            this.prisma.note.count({
               where: { userProfileId },
            }),
            this.prisma.bookmark.groupBy({
               by: ['audiobookId'],
               where: { userProfileId },
               _count: { audiobookId: true },
            }),
            this.prisma.note.groupBy({
               by: ['audiobookId'],
               where: { userProfileId },
               _count: { audiobookId: true },
            }),
         ]);

         // Get audiobook titles for the grouped results
         const audiobookIds = [
            ...new Set([
               ...bookmarksByAudiobook.map(b => b.audiobookId).filter((id): id is string => Boolean(id)),
               ...notesByAudiobook.map(n => n.audiobookId).filter((id): id is string => Boolean(id)),
            ])
         ];

         const audiobooks = await this.prisma.audioBook.findMany({
            where: { id: { in: audiobookIds } },
            select: { id: true, title: true },
         });

         const audiobookMap = new Map(audiobooks.map((ab: { id: string; title: string }) => [ab.id, ab.title]));

         return {
            totalBookmarks,
            totalNotes,
            bookmarksByAudiobook: bookmarksByAudiobook.map(b => ({
               audiobookId: b.audiobookId || '',
               audiobookTitle: audiobookMap.get(b.audiobookId || '') || 'Unknown',
               count: b._count.audiobookId,
            })),
            notesByAudiobook: notesByAudiobook.map(n => ({
               audiobookId: n.audiobookId || '',
               audiobookTitle: audiobookMap.get(n.audiobookId || '') || 'Unknown',
               count: n._count.audiobookId,
            })),
         };
      } catch (_error) {
         throw new ApiError('Failed to retrieve bookmark and note statistics', 500);
      }
   }
}
