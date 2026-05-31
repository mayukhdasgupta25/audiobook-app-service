/**
 * API versioning and routing configuration
 * Provides structured routing following best practices
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT } from '../middleware/AuthMiddleware';
import { createAudioBookRoutes } from './audioBookRoutes';
import { createChapterRoutes } from './chapterRoutes';
import { createPlaybackRoutes } from './playbackRoutes';
import { createBookmarkRoutes } from './bookmarkRoutes';
import { createOfflineDownloadRoutes } from './offlineDownloadRoutes';
import { createHealthRoutes } from './healthRoutes';
import { createGenreRoutes } from './genreRoutes';
import { createMoodRoutes } from './moodRoutes';
import { createStreamingRoutes } from './streamingRoutes';
import { createUserProfileRoutes } from './userProfileRoutes';
import { createUserAudioBookRoutes } from './userAudioBookRoutes';
import { createTagRoutes } from './tagRoutes';
import { createAuthorRoutes } from './authorRoutes';
import { createOrganizationRoutes } from './organizationRoutes';
import { createCommentRoutes } from './commentRoutes';
import { createReviewRoutes } from './reviewRoutes';
import { createFavoriteRoutes } from './favoriteRoutes';
import { createPlaylistRoutes } from './playlistRoutes';

export class ApiRouter {
  private static instance: ApiRouter;
  private router: Router;
  private prisma: PrismaClient;

  private constructor() {
    this.router = Router();
    this.prisma = new PrismaClient();
    this.setupRoutes();
  }

  /**
   * Singleton pattern for router instance
   */
  public static getInstance(): ApiRouter {
    if (!ApiRouter.instance) {
      ApiRouter.instance = new ApiRouter();
    }
    return ApiRouter.instance;
  }

  /**
   * Get the configured router
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Setup all API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.router.use('/', createHealthRoutes());

    // API versioning
    this.setupV1Routes();
  }

  /**
   * Setup API v1 routes
   * Protected with JWT authentication middleware
   */
  private setupV1Routes(): void {
    const v1Router = Router();

    // Apply JWT authentication middleware to all v1 routes
    // This ensures all API endpoints require valid JWT tokens
    v1Router.use(authenticateJWT);

    // Mount all route modules (protected routes)
    v1Router.use('/audiobooks', createAudioBookRoutes(this.prisma));
    v1Router.use('/', createChapterRoutes(this.prisma));
    v1Router.use('/playback', createPlaybackRoutes(this.prisma));
    v1Router.use('/', createBookmarkRoutes(this.prisma));
    v1Router.use('/', createOfflineDownloadRoutes(this.prisma));
    v1Router.use('/genres', createGenreRoutes(this.prisma));
    v1Router.use('/moods', createMoodRoutes(this.prisma));
    v1Router.use('/tags', createTagRoutes(this.prisma));
    v1Router.use('/authors', createAuthorRoutes(this.prisma));
    v1Router.use('/stream', createStreamingRoutes(this.prisma));
    v1Router.use('/', createUserProfileRoutes(this.prisma));
    v1Router.use('/user-audiobooks', createUserAudioBookRoutes(this.prisma));
    v1Router.use('/organizations', createOrganizationRoutes(this.prisma));
    v1Router.use('/comments', createCommentRoutes(this.prisma));
    v1Router.use('/reviews', createReviewRoutes(this.prisma));
    v1Router.use('/favorites', createFavoriteRoutes(this.prisma));
    v1Router.use('/playlists', createPlaylistRoutes(this.prisma));

    // Mount v1 routes
    this.router.use('/v1', v1Router);
  }

}
