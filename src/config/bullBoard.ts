/**
 * Bull Board Configuration
 * Sets up the Bull Board UI for monitoring queues
 */
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QueueManager } from './queue';
import { QueueFactory } from './queue';
import { ResponseHandler } from '../utils/ResponseHandler';
import { MessageHandler } from '../utils/MessageHandler';

export class BullBoardConfig {
   private static instance: BullBoardConfig;
   private expressAdapter: ExpressAdapter;
   private queueManager: QueueManager;

   private constructor() {
      this.queueManager = QueueManager.getInstance();
      this.expressAdapter = new ExpressAdapter();
      this.expressAdapter.setBasePath('/admin/queues');
      this.setupBullBoard();
   }

   /**
    * Get BullBoardConfig instance
    */
   public static getInstance(): BullBoardConfig {
      if (!BullBoardConfig.instance) {
         BullBoardConfig.instance = new BullBoardConfig();
      }
      return BullBoardConfig.instance;
   }

   /**
    * Setup Bull Board with all queues
    */
   private setupBullBoard(): void {
      try {
         // Get all queues from queue manager
         const queues = this.queueManager.getAllQueues();

         // Convert Bull queues to BullAdapter instances
         const bullAdapters = Array.from(queues.values()).map(queue =>
            new BullAdapter(queue)
         );

         // Create Bull Board
         createBullBoard({
            queues: bullAdapters,
            serverAdapter: this.expressAdapter,
         });

         console.log('✅ Bull Board configured successfully');
         console.log(`📊 Monitoring ${bullAdapters.length} queues:`, Array.from(queues.keys()));
      } catch (error) {
         // console.error('❌ Failed to configure Bull Board:', error);
         throw error;
      }
   }

   /**
    * Get Express router for Bull Board
    */
   public getRouter() {
      return this.expressAdapter.getRouter();
   }

   /**
    * Add a new queue to Bull Board
    */
   public addQueue(queue: any): void {
      try {
         // Recreate Bull Board with new queue
         const queues = this.queueManager.getAllQueues();
         const bullAdapters = Array.from(queues.values()).map(q =>
            new BullAdapter(q)
         );

         createBullBoard({
            queues: bullAdapters,
            serverAdapter: this.expressAdapter,
         });

         console.log(`✅ Added queue '${queue.name}' to Bull Board`);
      } catch (_error) {
         // console.error(`❌ Failed to add queue '${queue.name}' to Bull Board:`, _error);
      }
   }

   /**
    * Remove a queue from Bull Board
    */
   public removeQueue(queueName: string): void {
      try {
         const queues = this.queueManager.getAllQueues();
         queues.delete(queueName);

         const bullAdapters = Array.from(queues.values()).map(queue =>
            new BullAdapter(queue)
         );

         createBullBoard({
            queues: bullAdapters,
            serverAdapter: this.expressAdapter,
         });

         console.log(`✅ Removed queue '${queueName}' from Bull Board`);
      } catch (_error) {
         // console.error(`❌ Failed to remove queue '${queueName}' from Bull Board:`, _error);
      }
   }

   /**
    * Get queue statistics for Bull Board
    */
   public async getQueueStats(): Promise<any> {
      try {
         return await this.queueManager.getQueueStats();
      } catch (_error) {
         // console.error('❌ Failed to get queue stats:', _error);
         return {};
      }
   }

   /**
    * Get Redis connection info
    */
   public async getRedisInfo(): Promise<any> {
      try {
         return await this.queueManager.getRedisInfo();
      } catch (_error) {
         // console.error('❌ Failed to get Redis info:', _error);
         return { connected: false };
      }
   }
}

/**
 * Bull Board Authentication Middleware
 * Protects Bull Board access with admin authentication
 */
export class BullBoardAuth {
   /**
    * Require admin authentication for Bull Board access
    */
   public static requireAdmin = (req: any, res: any, next: any): void => {
      try {
         // Check if user is authenticated
         if (!req.session?.user) {
            ResponseHandler.unauthorized(res, MessageHandler.getErrorMessage('unauthorized.not_authenticated'));
            return;
         }

         // Check if user is admin (you can customize this logic)
         const isAdmin = req.session.user.role === 'admin' ||
            req.session.user.isAdmin === true ||
            req.session.user.email === 'admin@audiobook.com'; // Customize this

         if (!isAdmin) {
            ResponseHandler.forbidden(res, MessageHandler.getErrorMessage('forbidden.admin_required'));
            return;
         }

         next();
      } catch (_error) {
         // console.error('Bull Board auth error:', _error);
         ResponseHandler.unauthorized(res, MessageHandler.getErrorMessage('unauthorized.not_authenticated'));
      }
   };

   /**
    * Optional authentication for Bull Board access
    * Shows limited info for non-admin users
    */
   public static optionalAuth = (req: any, res: any, next: any): void => {
      try {
         if (!req.session?.user) {
            // Redirect to login or show limited access
            res.status(401).json({
               success: false,
               message: 'Authentication required to access queue monitoring',
               loginUrl: '/api/v1/auth/login'
            });
            return;
         }

         next();
      } catch (_error) {
         // console.error('Bull Board optional auth error:', _error);
         ResponseHandler.unauthorized(res, MessageHandler.getErrorMessage('unauthorized.not_authenticated'));
      }
   };
}

/**
 * Bull Board API endpoints for additional functionality
 */
export class BullBoardAPI {
   /**
    * Get queue statistics API endpoint
    */
   public static getQueueStats = async (_req: any, res: any): Promise<void> => {
      try {
         const bullBoardConfig = BullBoardConfig.getInstance();
         const stats = await bullBoardConfig.getQueueStats();
         const redisInfo = await bullBoardConfig.getRedisInfo();

         ResponseHandler.success(res, {
            queues: stats,
            redis: redisInfo,
            timestamp: new Date().toISOString()
         }, 'Queue statistics retrieved successfully');
      } catch (_error) {
         // console.error('Failed to get queue stats:', _error);
         ResponseHandler.internalError(res, 'Failed to retrieve queue statistics');
      }
   };

   /**
    * Pause queue API endpoint
    */
   public static pauseQueue = async (req: any, res: any): Promise<void> => {
      try {
         const { queueName } = req.params;
         const queueManager = QueueFactory.getQueueManager();

         await queueManager.pauseQueue(queueName);

         ResponseHandler.success(res, { queueName }, `Queue '${queueName}' paused successfully`);
      } catch (_error) {
         // console.error('Failed to pause queue:', _error);
         ResponseHandler.internalError(res, 'Failed to pause queue');
      }
   };

   /**
    * Resume queue API endpoint
    */
   public static resumeQueue = async (req: any, res: any): Promise<void> => {
      try {
         const { queueName } = req.params;
         const queueManager = QueueFactory.getQueueManager();

         await queueManager.resumeQueue(queueName);

         ResponseHandler.success(res, { queueName }, `Queue '${queueName}' resumed successfully`);
      } catch (_error) {
         // console.error('Failed to resume queue:', _error);
         ResponseHandler.internalError(res, 'Failed to resume queue');
      }
   };

   /**
    * Clean queue API endpoint
    */
   public static cleanQueue = async (req: any, res: any): Promise<void> => {
      try {
         const { queueName } = req.params;
         const { type = 'completed', grace = 0 } = req.query;
         const queueManager = QueueFactory.getQueueManager();

         await queueManager.cleanQueue(queueName, grace, type);

         ResponseHandler.success(res, { queueName, type, grace }, `Queue '${queueName}' cleaned successfully`);
      } catch (_error) {
         // console.error('Failed to clean queue:', _error);
         ResponseHandler.internalError(res, 'Failed to clean queue');
      }
   };

   /**
    * Empty queue API endpoint
    */
   public static emptyQueue = async (req: any, res: any): Promise<void> => {
      try {
         const { queueName } = req.params;
         const queueManager = QueueFactory.getQueueManager();

         await queueManager.emptyQueue(queueName);

         ResponseHandler.success(res, { queueName }, `Queue '${queueName}' emptied successfully`);
      } catch (_error) {
         // console.error('Failed to empty queue:', _error);
         ResponseHandler.internalError(res, 'Failed to empty queue');
      }
   };
}
