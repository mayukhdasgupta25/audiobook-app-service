/**
 * BookmarkNoteDto Tests
 * Tests for Bookmark and Note DTO interfaces
 */

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
   BookmarkNoteStats,
} from '../../models/BookmarkNoteDto';

describe('BookmarkNoteDto', () => {
   // Mock factories for Bookmark
   const createMockBookmarkData = (overrides = {}): BookmarkData => {
      return {
         id: 'bookmark-id',
         userProfileId: 'user-id',
         audiobookId: 'audiobook-id',
         chapterId: 'chapter-id',
         title: 'Important Bookmark',
         description: 'Bookmark description',
         position: 120, // 2 minutes
         timestamp: new Date('2024-01-10'),
         createdAt: new Date('2024-01-01'),
         updatedAt: new Date('2024-01-02'),
         ...overrides,
      };
   };

   const createMockBookmarkWithRelations = (overrides = {}): BookmarkWithRelations => {
      const baseBookmark = createMockBookmarkData();
      return {
         ...baseBookmark,
         audiobook: {
            id: 'audiobook-id',
            title: 'Test Audiobook',
            author: 'Test Author',
         },
         chapter: {
            id: 'chapter-id',
            title: 'Test Chapter',
            chapterNumber: 1,
         },
         ...overrides,
      };
   };

   const createMockNoteData = (overrides = {}): NoteData => {
      return {
         id: 'note-id',
         userProfileId: 'user-id',
         audiobookId: 'audiobook-id',
         chapterId: 'chapter-id',
         title: 'My Note',
         content: 'This is a test note',
         position: 180, // 3 minutes
         timestamp: new Date('2024-01-10'),
         createdAt: new Date('2024-01-01'),
         updatedAt: new Date('2024-01-02'),
         ...overrides,
      };
   };

   const createMockNoteWithRelations = (overrides = {}): NoteWithRelations => {
      const baseNote = createMockNoteData();
      return {
         ...baseNote,
         audiobook: {
            id: 'audiobook-id',
            title: 'Test Audiobook',
            author: 'Test Author',
         },
         chapter: {
            id: 'chapter-id',
            title: 'Test Chapter',
            chapterNumber: 1,
         },
         ...overrides,
      };
   };

   describe('BookmarkData', () => {
      it('should create valid BookmarkData object', () => {
         const bookmark = createMockBookmarkData();

         expect(bookmark.id).toBe('bookmark-id');
         expect(bookmark.userProfileId).toBe('user-id');
         expect(bookmark.audiobookId).toBe('audiobook-id');
         expect(bookmark.chapterId).toBe('chapter-id');
         expect(bookmark.title).toBe('Important Bookmark');
         expect(bookmark.description).toBe('Bookmark description');
         expect(bookmark.position).toBe(120);
         expect(bookmark.timestamp).toBeInstanceOf(Date);
      });

      it('should handle optional fields', () => {
         const minimalBookmark: BookmarkData = {
            id: 'bookmark-id',
            userProfileId: 'user-id',
            position: 60,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         expect(minimalBookmark.title).toBeUndefined();
         expect(minimalBookmark.description).toBeUndefined();
         expect(minimalBookmark.audiobookId).toBeUndefined();
         expect(minimalBookmark.chapterId).toBeUndefined();
         expect(minimalBookmark.position).toBe(60);
      });

      it('should handle audiobook-only bookmark', () => {
         const audiobookBookmark = createMockBookmarkData({
            chapterId: undefined,
         });

         expect(audiobookBookmark.audiobookId).toBe('audiobook-id');
         expect(audiobookBookmark.chapterId).toBeUndefined();
      });

      it('should handle chapter-only bookmark', () => {
         const chapterBookmark = createMockBookmarkData({
            audiobookId: undefined,
         });

         expect(chapterBookmark.chapterId).toBe('chapter-id');
         expect(chapterBookmark.audiobookId).toBeUndefined();
      });
   });

   describe('BookmarkWithRelations', () => {
      it('should create valid BookmarkWithRelations', () => {
         const bookmark = createMockBookmarkWithRelations();

         expect(bookmark.audiobook).toBeDefined();
         expect(bookmark.audiobook?.title).toBe('Test Audiobook');
         expect(bookmark.chapter).toBeDefined();
         expect(bookmark.chapter?.title).toBe('Test Chapter');
      });

      it('should handle optional audiobook relation', () => {
         const bookmark = createMockBookmarkWithRelations({
            audiobook: undefined,
         });

         expect(bookmark.audiobook).toBeUndefined();
      });

      it('should handle optional chapter relation', () => {
         const bookmark = createMockBookmarkWithRelations({
            chapter: undefined,
         });

         expect(bookmark.chapter).toBeUndefined();
      });
   });

   describe('CreateBookmarkRequest', () => {
      it('should create valid CreateBookmarkRequest', () => {
         const request: CreateBookmarkRequest = {
            audiobookId: 'audiobook-id',
            chapterId: 'chapter-id',
            title: 'New Bookmark',
            description: 'Description',
            position: 240,
         };

         expect(request.audiobookId).toBe('audiobook-id');
         expect(request.chapterId).toBe('chapter-id');
         expect(request.title).toBe('New Bookmark');
         expect(request.position).toBe(240);
      });

      it('should require position field', () => {
         const request: CreateBookmarkRequest = {
            position: 120,
         };

         expect(request.position).toBe(120);
      });

      it('should handle all optional fields', () => {
         const minimalRequest: CreateBookmarkRequest = {
            position: 60,
         };

         expect(minimalRequest.audiobookId).toBeUndefined();
         expect(minimalRequest.chapterId).toBeUndefined();
         expect(minimalRequest.title).toBeUndefined();
         expect(minimalRequest.description).toBeUndefined();
      });
   });

   describe('UpdateBookmarkRequest', () => {
      it('should accept all optional fields', () => {
         const update: UpdateBookmarkRequest = {
            title: 'Updated Title',
            description: 'Updated Description',
            position: 300,
         };

         expect(update.title).toBe('Updated Title');
         expect(update.description).toBe('Updated Description');
         expect(update.position).toBe(300);
      });

      it('should accept partial updates', () => {
         const partialUpdate: UpdateBookmarkRequest = {
            title: 'Only Title Updated',
         };

         expect(partialUpdate.title).toBe('Only Title Updated');
         expect(partialUpdate.description).toBeUndefined();
         expect(partialUpdate.position).toBeUndefined();
      });
   });

   describe('NoteData', () => {
      it('should create valid NoteData object', () => {
         const note = createMockNoteData();

         expect(note.id).toBe('note-id');
         expect(note.userProfileId).toBe('user-id');
         expect(note.audiobookId).toBe('audiobook-id');
         expect(note.chapterId).toBe('chapter-id');
         expect(note.title).toBe('My Note');
         expect(note.content).toBe('This is a test note');
         expect(note.position).toBe(180);
         expect(note.timestamp).toBeInstanceOf(Date);
      });

      it('should require content field', () => {
         const note = createMockNoteData({
            content: 'Required content',
         });

         expect(note.content).toBe('Required content');
      });

      it('should handle optional fields', () => {
         const minimalNote: NoteData = {
            id: 'note-id',
            userProfileId: 'user-id',
            content: 'Required content',
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
         };

         expect(minimalNote.title).toBeUndefined();
         expect(minimalNote.position).toBeUndefined();
         expect(minimalNote.content).toBe('Required content');
      });

      it('should handle note without position', () => {
         const note = createMockNoteData({
            position: undefined,
         });

         expect(note.position).toBeUndefined();
         expect(note.content).toBeDefined();
      });
   });

   describe('NoteWithRelations', () => {
      it('should create valid NoteWithRelations', () => {
         const note = createMockNoteWithRelations();

         expect(note.audiobook).toBeDefined();
         expect(note.audiobook?.title).toBe('Test Audiobook');
         expect(note.chapter).toBeDefined();
         expect(note.chapter?.title).toBe('Test Chapter');
      });

      it('should handle optional relations', () => {
         const note = createMockNoteWithRelations({
            audiobook: undefined,
            chapter: undefined,
         });

         expect(note.audiobook).toBeUndefined();
         expect(note.chapter).toBeUndefined();
      });
   });

   describe('CreateNoteRequest', () => {
      it('should create valid CreateNoteRequest', () => {
         const request: CreateNoteRequest = {
            audiobookId: 'audiobook-id',
            chapterId: 'chapter-id',
            title: 'My Note',
            content: 'Note content',
            position: 240,
         };

         expect(request.audiobookId).toBe('audiobook-id');
         expect(request.content).toBe('Note content');
         expect(request.position).toBe(240);
      });

      it('should require content field', () => {
         const request: CreateNoteRequest = {
            content: 'Required content',
         };

         expect(request.content).toBe('Required content');
      });

      it('should handle all optional fields', () => {
         const minimalRequest: CreateNoteRequest = {
            content: 'Only content required',
         };

         expect(minimalRequest.content).toBe('Only content required');
         expect(minimalRequest.title).toBeUndefined();
         expect(minimalRequest.position).toBeUndefined();
      });
   });

   describe('UpdateNoteRequest', () => {
      it('should accept all optional fields', () => {
         const update: UpdateNoteRequest = {
            title: 'Updated Title',
            content: 'Updated Content',
            position: 300,
         };

         expect(update.title).toBe('Updated Title');
         expect(update.content).toBe('Updated Content');
         expect(update.position).toBe(300);
      });

      it('should accept partial updates', () => {
         const partialUpdate: UpdateNoteRequest = {
            content: 'Only content updated',
         };

         expect(partialUpdate.content).toBe('Only content updated');
         expect(partialUpdate.title).toBeUndefined();
         expect(partialUpdate.position).toBeUndefined();
      });
   });

   describe('BookmarkNoteQueryParams', () => {
      it('should create valid query parameters', () => {
         const params: BookmarkNoteQueryParams = {
            audiobookId: 'audiobook-id',
            chapterId: 'chapter-id',
            page: 1,
            limit: 20,
            sortBy: 'timestamp',
            sortOrder: 'desc',
            search: 'keyword',
         };

         expect(params.audiobookId).toBe('audiobook-id');
         expect(params.chapterId).toBe('chapter-id');
         expect(params.page).toBe(1);
         expect(params.limit).toBe(20);
         expect(params.sortOrder).toBe('desc');
         expect(params.search).toBe('keyword');
      });

      it('should handle ascending sort order', () => {
         const params: BookmarkNoteQueryParams = {
            sortOrder: 'asc',
         };

         expect(params.sortOrder).toBe('asc');
      });

      it('should handle partial query parameters', () => {
         const params: BookmarkNoteQueryParams = {
            page: 1,
            limit: 10,
         };

         expect(params.page).toBe(1);
         expect(params.limit).toBe(10);
      });
   });

   describe('BookmarkNoteResponse', () => {
      it('should create valid BookmarkNoteResponse', () => {
         const bookmarks = [createMockBookmarkWithRelations()];
         const notes = [createMockNoteWithRelations()];

         const response: BookmarkNoteResponse = {
            bookmarks,
            notes,
            totalBookmarks: 1,
            totalNotes: 1,
         };

         expect(response.bookmarks.length).toBe(1);
         expect(response.notes.length).toBe(1);
         expect(response.totalBookmarks).toBe(1);
         expect(response.totalNotes).toBe(1);
      });

      it('should handle empty arrays', () => {
         const response: BookmarkNoteResponse = {
            bookmarks: [],
            notes: [],
            totalBookmarks: 0,
            totalNotes: 0,
         };

         expect(response.bookmarks.length).toBe(0);
         expect(response.notes.length).toBe(0);
      });
   });

   describe('BookmarkNoteStats', () => {
      it('should create valid BookmarkNoteStats', () => {
         const stats: BookmarkNoteStats = {
            totalBookmarks: 10,
            totalNotes: 5,
            bookmarksByAudiobook: [
               {
                  audiobookId: 'audiobook-1',
                  audiobookTitle: 'Book 1',
                  count: 5,
               },
            ],
            notesByAudiobook: [
               {
                  audiobookId: 'audiobook-1',
                  audiobookTitle: 'Book 1',
                  count: 3,
               },
            ],
         };

         expect(stats.totalBookmarks).toBe(10);
         expect(stats.totalNotes).toBe(5);
         expect(stats.bookmarksByAudiobook.length).toBe(1);
         expect(stats.notesByAudiobook.length).toBe(1);
      });

      it('should handle multiple audiobooks', () => {
         const stats: BookmarkNoteStats = {
            totalBookmarks: 20,
            totalNotes: 15,
            bookmarksByAudiobook: [
               { audiobookId: 'id1', audiobookTitle: 'Book 1', count: 10 },
               { audiobookId: 'id2', audiobookTitle: 'Book 2', count: 10 },
            ],
            notesByAudiobook: [
               { audiobookId: 'id1', audiobookTitle: 'Book 1', count: 8 },
               { audiobookId: 'id2', audiobookTitle: 'Book 2', count: 7 },
            ],
         };

         expect(stats.bookmarksByAudiobook.length).toBe(2);
         expect(stats.notesByAudiobook.length).toBe(2);
      });
   });

   describe('Edge cases', () => {
      it('should handle zero position', () => {
         const bookmark = createMockBookmarkData({ position: 0 });
         expect(bookmark.position).toBe(0);
      });

      it('should handle very large positions', () => {
         const bookmark = createMockBookmarkData({ position: 999999 });
         expect(bookmark.position).toBe(999999);
      });

      it('should handle empty string content', () => {
         const note = createMockNoteData({ content: '' });
         expect(note.content).toBe('');
      });

      it('should handle long content strings', () => {
         const longContent = 'A'.repeat(10000);
         const note = createMockNoteData({ content: longContent });
         expect(note.content.length).toBe(10000);
      });

      it('should handle negative position values', () => {
         const bookmark = createMockBookmarkData({ position: -1 });
         expect(bookmark.position).toBe(-1);
      });
   });
});

