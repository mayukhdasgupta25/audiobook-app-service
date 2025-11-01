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
import { createStreamingRoutes } from './streamingRoutes';
import { createUserProfileRoutes } from './userProfileRoutes';

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

    // Mount all route modules
    v1Router.use('/audiobooks', createAudioBookRoutes(this.prisma));
    v1Router.use('/', createChapterRoutes(this.prisma));
    v1Router.use('/playback', createPlaybackRoutes(this.prisma));
    v1Router.use('/', createBookmarkRoutes(this.prisma));
    v1Router.use('/', createOfflineDownloadRoutes(this.prisma));
    v1Router.use('/genres', createGenreRoutes(this.prisma));
    v1Router.use('/stream', createStreamingRoutes(this.prisma));
    v1Router.use('/', createUserProfileRoutes(this.prisma));

    // Mount v1 routes
    this.router.use('/v1', v1Router);
  }

}
