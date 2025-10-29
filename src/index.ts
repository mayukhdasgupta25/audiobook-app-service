import './config/env';
import './types/session'; // Load session type extensions
import cors from 'cors';
import session from 'express-session';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import { ApiRouter } from './routes/ApiRouter';
import { ErrorHandler } from './middleware/ErrorHandler';
import { MessageHandler } from './utils/MessageHandler';
import { setupSwagger } from './config/swagger';
import { BullBoardConfig, BullBoardAPI } from './config/bullBoard';
import { QueueFactory } from './config/queue';
import { RabbitMQFactory } from './config/rabbitmq';
import { TranscodingWorkerFactory } from './workers/TranscodingWorker';
import { UserConsumerWorkerFactory } from './workers/UserConsumerWorker';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
   origin: process.env['CLIENT_URL'] || 'http://localhost:5173',
   credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
   secret: process.env['SESSION_SECRET'] || 'your-secret-key',
   resave: false,
   saveUninitialized: false,
   cookie: {
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
   }
}));

// Session validation middleware

// Initialize queues
const queueManager = QueueFactory.getQueueManager();
queueManager.createProgressQueue();
queueManager.createDownloadQueue();
queueManager.createCleanupQueue();

// Initialize RabbitMQ, transcoding worker, and user consumer worker
(async (): Promise<void> => {
   try {
      await RabbitMQFactory.initialize();
      console.log('RabbitMQ initialized successfully');

      // Start transcoding worker
      const prisma = require('./lib/prisma').prisma;
      await TranscodingWorkerFactory.startWorker(prisma);

      // Start user consumer worker
      await UserConsumerWorkerFactory.startWorker(prisma);
   } catch (_error) {
      // console.error('Failed to initialize RabbitMQ, transcoding worker, or user consumer worker:', _error);
   }
})();

// Initialize Bull Board
const bullBoardConfig = BullBoardConfig.getInstance();

// Bull Board UI (publicly accessible)
app.use('/admin/queues', bullBoardConfig.getRouter());

// Bull Board API endpoints (publicly accessible)
app.get('/admin/queues/stats', BullBoardAPI.getQueueStats);
app.post('/admin/queues/:queueName/pause', BullBoardAPI.pauseQueue);
app.post('/admin/queues/:queueName/resume', BullBoardAPI.resumeQueue);
app.post('/admin/queues/:queueName/clean', BullBoardAPI.cleanQueue);
app.post('/admin/queues/:queueName/empty', BullBoardAPI.emptyQueue);

// Static file serving for uploads (development only)
if (config.NODE_ENV === 'development') {
   app.use('/uploads', express.static(path.join(process.cwd(), 'src', 'uploads')));
}

// API Routes
const apiRouter = ApiRouter.getInstance();
app.use('/api', apiRouter.getRouter());

// Swagger Documentation
setupSwagger(app);

// Root endpoint
app.get('/', (_req, res) => {
   res.json({
      message: MessageHandler.getApiInfo('info.title'),
      version: MessageHandler.getApiInfo('info.version'),
      status: MessageHandler.getApiInfo('info.status_running'),
      timestamp: new Date().toISOString(),
      endpoints: MessageHandler.getApiInfo('info.endpoints'),
      admin: {
         bullBoard: '/admin/queues',
         queueStats: '/admin/queues/stats'
      }
   });
});

// 404 handler for undefined routes
app.use((req, res) => ErrorHandler.handleNotFound(req, res));

// Global error handler
app.use(ErrorHandler.handleError);

app.listen(config.PORT, () => {
   console.log(`🚀 Server running on port ${config.PORT}`);
   console.log(`📚 Environment: ${config.NODE_ENV}`);
   console.log(`🔗 API Base URL: http://localhost:${config.PORT}/api`);
   console.log(`📚 Swagger UI: http://localhost:${config.PORT}/api-docs`);
   console.log(`📋 OpenAPI Spec: http://localhost:${config.PORT}/api-docs.json`);
   console.log(`📊 Bull Board UI: http://localhost:${config.PORT}/admin/queues`);
   console.log(`📈 Queue Stats API: http://localhost:${config.PORT}/admin/queues/stats`);
});