/**
 * Player API Integration Tests
 * Tests for the audiobook player API endpoints
 */
import request from 'supertest';
import { Express } from 'express';
import { ApiRouter } from '../routes/ApiRouter';

// Mock the Prisma client
jest.mock('@prisma/client', () => ({
   PrismaClient: jest.fn().mockImplementation(() => ({
      audiobook: {
         findMany: jest.fn(),
         findUnique: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
         count: jest.fn(),
      },
      chapter: {
         findMany: jest.fn(),
         findUnique: jest.fn(),
         findFirst: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
         count: jest.fn(),
      },
      chapterProgress: {
         findUnique: jest.fn(),
         upsert: jest.fn(),
         updateMany: jest.fn(),
      },
      bookmark: {
         findMany: jest.fn(),
         findFirst: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
         count: jest.fn(),
      },
      note: {
         findMany: jest.fn(),
         findFirst: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
         count: jest.fn(),
      },
      offlineDownload: {
         findMany: jest.fn(),
         findFirst: jest.fn(),
         findUnique: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         delete: jest.fn(),
         count: jest.fn(),
      },
      listeningHistory: {
         findUnique: jest.fn(),
         upsert: jest.fn(),
      },
   })),
}));

// Mock Redis and Bull
jest.mock('bull', () => ({
   Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      process: jest.fn(),
      close: jest.fn(),
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
   })),
}));

jest.mock('ioredis', () => ({
   Redis: jest.fn().mockImplementation(() => ({
      ping: jest.fn().mockResolvedValue('PONG'),
      info: jest.fn().mockResolvedValue('redis_version:6.0.0'),
      dbsize: jest.fn().mockResolvedValue(0),
      quit: jest.fn().mockResolvedValue('OK'),
   })),
}));

describe('Player API Integration Tests', () => {
   let app: Express;
   let apiRouter: ApiRouter;

   beforeAll(() => {
      // Create Express app and mount API router
      const express = require('express');
      app = express();

      // Add middleware
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      // Mock session middleware
      app.use((req: any, res: any, next: any) => {
         req.session = {
            userId: 'test-user-id',
            user: { id: 'test-user-id', email: 'test@example.com' },
         };
         next();
      });

      // Mount API router
      apiRouter = ApiRouter.getInstance();
      app.use('/api', apiRouter.getRouter());
   });

   describe('Chapter Endpoints', () => {
      it('should get chapters for an audiobook', async () => {
         const response = await request(app)
            .get('/api/v1/audiobooks/test-audiobook-id/chapters')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should get chapter by ID', async () => {
         const response = await request(app)
            .get('/api/v1/chapters/test-chapter-id')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should create a new chapter', async () => {
         const chapterData = {
            audiobookId: 'test-audiobook-id',
            title: 'Test Chapter',
            chapterNumber: 1,
            duration: 1800,
            filePath: '/path/to/chapter.mp3',
            fileSize: 50000000,
            startPosition: 0,
            endPosition: 1800,
         };

         const response = await request(app)
            .post('/api/v1/chapters')
            .send(chapterData)
            .expect(201);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should update chapter progress', async () => {
         const progressData = {
            currentPosition: 300,
            completed: false,
         };

         const response = await request(app)
            .put('/api/v1/chapters/test-chapter-id/progress')
            .send(progressData)
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });
   });

   describe('Playback Endpoints', () => {
      it('should initialize playback session', async () => {
         const sessionData = {
            audiobookId: 'test-audiobook-id',
            chapterId: 'test-chapter-id',
         };

         const response = await request(app)
            .post('/api/v1/playback/session')
            .send(sessionData)
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should control playback', async () => {
         const controlData = {
            audiobookId: 'test-audiobook-id',
            action: 'play',
         };

         const response = await request(app)
            .post('/api/v1/playback/control')
            .send(controlData)
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should seek to position', async () => {
         const seekData = {
            audiobookId: 'test-audiobook-id',
            position: 300,
         };

         const response = await request(app)
            .post('/api/v1/playback/seek')
            .send(seekData)
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should change playback speed', async () => {
         const speedData = {
            audiobookId: 'test-audiobook-id',
            speed: 1.5,
         };

         const response = await request(app)
            .post('/api/v1/playback/speed')
            .send(speedData)
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should navigate to chapter', async () => {
         const navigationData = {
            audiobookId: 'test-audiobook-id',
            chapterId: 'test-chapter-id',
            position: 0,
         };

         const response = await request(app)
            .post('/api/v1/playback/navigate')
            .send(navigationData)
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should get playback stats', async () => {
         const response = await request(app)
            .get('/api/v1/playback/stats')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });
   });

   describe('Bookmark Endpoints', () => {
      it('should create a bookmark', async () => {
         const bookmarkData = {
            audiobookId: 'test-audiobook-id',
            title: 'Important Scene',
            description: 'Key moment in the story',
            position: 1200,
         };

         const response = await request(app)
            .post('/api/v1/bookmarks')
            .send(bookmarkData)
            .expect(201);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should get user bookmarks', async () => {
         const response = await request(app)
            .get('/api/v1/bookmarks')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should create a note', async () => {
         const noteData = {
            audiobookId: 'test-audiobook-id',
            title: 'Character Analysis',
            content: 'The protagonist shows great development',
            position: 1200,
         };

         const response = await request(app)
            .post('/api/v1/notes')
            .send(noteData)
            .expect(201);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should get user notes', async () => {
         const response = await request(app)
            .get('/api/v1/notes')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should get combined bookmarks and notes', async () => {
         const response = await request(app)
            .get('/api/v1/bookmarks-notes')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });
   });

   describe('Offline Download Endpoints', () => {
      it('should request offline download', async () => {
         const downloadData = {
            audiobookId: 'test-audiobook-id',
            quality: 'high',
         };

         const response = await request(app)
            .post('/api/v1/downloads')
            .send(downloadData)
            .expect(201);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should get user downloads', async () => {
         const response = await request(app)
            .get('/api/v1/downloads')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should get download progress', async () => {
         const response = await request(app)
            .get('/api/v1/downloads/test-download-id/progress')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });

      it('should cancel download', async () => {
         const response = await request(app)
            .post('/api/v1/downloads/test-download-id/cancel')
            .expect(200);

         expect(response.body.success).toBe(true);
         expect(response.body.data).toBeDefined();
      });
   });

   describe('Error Handling', () => {
      it('should handle invalid chapter ID', async () => {
         const response = await request(app)
            .get('/api/v1/chapters/invalid-id')
            .expect(404);

         expect(response.body.success).toBe(false);
         expect(response.body.message).toBeDefined();
      });

      it('should handle invalid playback control', async () => {
         const invalidControlData = {
            audiobookId: 'test-audiobook-id',
            action: 'invalid-action',
         };

         const response = await request(app)
            .post('/api/v1/playback/control')
            .send(invalidControlData)
            .expect(400);

         expect(response.body.success).toBe(false);
         expect(response.body.message).toBeDefined();
      });

      it('should handle invalid seek position', async () => {
         const invalidSeekData = {
            audiobookId: 'test-audiobook-id',
            position: -100,
         };

         const response = await request(app)
            .post('/api/v1/playback/seek')
            .send(invalidSeekData)
            .expect(400);

         expect(response.body.success).toBe(false);
         expect(response.body.message).toBeDefined();
      });
   });
});
