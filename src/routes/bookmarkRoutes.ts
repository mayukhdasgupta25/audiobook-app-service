/**
 * Bookmark and Note Routes
 * Handles bookmark and note management for audiobooks and chapters
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BookmarkController } from '../controllers/BookmarkController';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware';

export function createBookmarkRoutes(prisma: PrismaClient): Router {
   const router = Router();
   const bookmarkController = new BookmarkController(prisma);

   // Bookmark routes
   router.post(
      '/bookmarks',
      bookmarkController.createBookmark
   );

   router.get(
      '/bookmarks',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      bookmarkController.getBookmarks
   );

   router.get(
      '/bookmarks/:id',
      ValidationMiddleware.validateId,
      bookmarkController.getBookmarkById
   );

   router.put(
      '/bookmarks/:id',
      ValidationMiddleware.validateId,
      bookmarkController.updateBookmark
   );

   router.delete(
      '/bookmarks/:id',
      ValidationMiddleware.validateId,
      bookmarkController.deleteBookmark
   );

   // Note routes
   router.post(
      '/notes',
      bookmarkController.createNote
   );

   router.get(
      '/notes',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      bookmarkController.getNotes
   );

   router.get(
      '/notes/:id',
      ValidationMiddleware.validateId,
      bookmarkController.getNoteById
   );

   router.put(
      '/notes/:id',
      ValidationMiddleware.validateId,
      bookmarkController.updateNote
   );

   router.delete(
      '/notes/:id',
      ValidationMiddleware.validateId,
      bookmarkController.deleteNote
   );

   // Combined bookmark and note routes
   router.get(
      '/bookmarks-notes',
      ValidationMiddleware.validatePagination,
      ValidationMiddleware.sanitizeQueryParams,
      bookmarkController.getBookmarksAndNotes
   );

   router.get(
      '/bookmarks-notes/stats',
      bookmarkController.getBookmarkNoteStats
   );

   return router;
}
