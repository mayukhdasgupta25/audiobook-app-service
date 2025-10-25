/**
 * Bull Queue Setup
 * Configures and manages Bull queues for background jobs
 */
import Bull from 'bull';
import { RedisConnection, RedisConfigHelper } from './redis';
import {
   ProgressCalculationJobData,
   OfflineDownloadJobData,
   CleanupJobData
} from '../services/BackgroundJobService';

export interface QueueConfig {
   name: string;
   redis: {
      host: string;
      port: number;
      password?: string;
      db?: number;
   };
   defaultJobOptions?: Bull.JobOptions;
}

export class QueueManager {
   private static instance: QueueManager;
   private queues: Map<string, Bull.Queue> = new Map();
   private redisConnection: RedisConnection;

   private constructor() {
      this.redisConnection = RedisConnection.getInstance();
   }

   /**
    * Get QueueManager instance
    */
   public static getInstance(): QueueManager {
      if (!QueueManager.instance) {
         QueueManager.instance = new QueueManager();
      }
      return QueueManager.instance;
   }

   /**
    * Create a new queue
    */
   public createQueue<T = any>(name: string, config?: Partial<QueueConfig>): Bull.Queue<T> {
      if (this.queues.has(name)) {
         return this.queues.get(name)!;
      }

      const redisConfig = RedisConfigHelper.getConfigFromEnv();
      const redisUrl = RedisConfigHelper.getRedisUrl(redisConfig);

      const queueConfig: QueueConfig = {
         name,
         redis: redisUrl as any,
         defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 5,
            attempts: 3,
            backoff: {
               type: 'exponential',
               delay: 2000,
            },
            ...config?.defaultJobOptions,
         },
         ...config,
      };

      const queue = new Bull<T>(name, {
         redis: queueConfig.redis,
         defaultJobOptions: queueConfig.defaultJobOptions,
      });

      this.setupQueueEventHandlers(queue, name);
      this.queues.set(name, queue);

      console.log(`Queue '${name}' created successfully`);
      return queue;
   }

   /**
    * Get an existing queue
    */
   public getQueue<T = any>(name: string): Bull.Queue<T> | undefined {
      return this.queues.get(name);
   }

   /**
    * Get all queues
    */
   public getAllQueues(): Map<string, Bull.Queue> {
      return this.queues;
   }

   /**
    * Setup queue event handlers
    */
   private setupQueueEventHandlers(queue: Bull.Queue, name: string): void {
      queue.on('ready', () => {
         console.log(`Queue '${name}' is ready`);
      });

      queue.on('error', (error) => {
         console.error(`Queue '${name}' error:`, error);
      });

      queue.on('waiting', (jobId) => {
         console.log(`Job ${jobId} is waiting in queue '${name}'`);
      });

      queue.on('active', (job) => {
         console.log(`Job ${job.id} is active in queue '${name}'`);
      });

      queue.on('stalled', (job) => {
         console.log(`Job ${job.id} is stalled in queue '${name}'`);
      });

      queue.on('progress', (job, progress) => {
         console.log(`Job ${job.id} progress: ${progress}% in queue '${name}'`);
      });

      queue.on('completed', (job, _result) => {
         console.log(`Job ${job.id} completed in queue '${name}'`);
      });

      queue.on('failed', (job, err) => {
         console.error(`Job ${job.id} failed in queue '${name}':`, err.message);
      });

      queue.on('paused', () => {
         console.log(`Queue '${name}' is paused`);
      });

      queue.on('resumed', () => {
         console.log(`Queue '${name}' is resumed`);
      });

      queue.on('cleaned', (jobs, type) => {
         console.log(`Cleaned ${jobs.length} ${type} jobs from queue '${name}'`);
      });

      queue.on('drained', () => {
         console.log(`Queue '${name}' is drained`);
      });
   }

   /**
    * Create progress calculation queue
    */
   public createProgressQueue(): Bull.Queue<ProgressCalculationJobData> {
      return this.createQueue<ProgressCalculationJobData>('progress-calculation', {
         defaultJobOptions: {
            removeOnComplete: 20,
            removeOnFail: 10,
            attempts: 3,
            backoff: {
               type: 'exponential',
               delay: 2000,
            },
         },
      });
   }

   /**
    * Create offline download queue
    */
   public createDownloadQueue(): Bull.Queue<OfflineDownloadJobData> {
      return this.createQueue<OfflineDownloadJobData>('offline-download', {
         defaultJobOptions: {
            removeOnComplete: 5,
            removeOnFail: 10,
            attempts: 1, // We handle retries manually
            backoff: {
               type: 'exponential',
               delay: 5000,
            },
         },
      });
   }

   /**
    * Create cleanup queue
    */
   public createCleanupQueue(): Bull.Queue<CleanupJobData> {
      return this.createQueue<CleanupJobData>('cleanup', {
         defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 20,
            attempts: 2,
            backoff: {
               type: 'exponential',
               delay: 10000,
            },
         },
      });
   }

   /**
    * Get queue statistics
    */
   public async getQueueStats(): Promise<{
      [queueName: string]: {
         waiting: number;
         active: number;
         completed: number;
         failed: number;
         delayed: number;
         paused: boolean;
      };
   }> {
      const stats: any = {};

      for (const [name, queue] of this.queues) {
         const jobCounts = await queue.getJobCounts();
         const isPaused = await queue.isPaused();

         stats[name] = {
            ...jobCounts,
            paused: isPaused,
         };
      }

      return stats;
   }

   /**
    * Pause a queue
    */
   public async pauseQueue(name: string): Promise<void> {
      const queue = this.queues.get(name);
      if (queue) {
         await queue.pause();
         console.log(`Queue '${name}' paused`);
      } else {
         throw new Error(`Queue '${name}' not found`);
      }
   }

   /**
    * Resume a queue
    */
   public async resumeQueue(name: string): Promise<void> {
      const queue = this.queues.get(name);
      if (queue) {
         await queue.resume();
         console.log(`Queue '${name}' resumed`);
      } else {
         throw new Error(`Queue '${name}' not found`);
      }
   }

   /**
    * Clean a queue
    */
   public async cleanQueue(name: string, grace: number = 0, type: 'completed' | 'failed' | 'active' | 'delayed' = 'completed'): Promise<void> {
      const queue = this.queues.get(name);
      if (queue) {
         await queue.clean(grace, type);
         console.log(`Queue '${name}' cleaned (${type})`);
      } else {
         throw new Error(`Queue '${name}' not found`);
      }
   }

   /**
    * Empty a queue
    */
   public async emptyQueue(name: string): Promise<void> {
      const queue = this.queues.get(name);
      if (queue) {
         await queue.empty();
         console.log(`Queue '${name}' emptied`);
      } else {
         throw new Error(`Queue '${name}' not found`);
      }
   }

   /**
    * Remove a queue
    */
   public async removeQueue(name: string): Promise<void> {
      const queue = this.queues.get(name);
      if (queue) {
         await queue.close();
         this.queues.delete(name);
         console.log(`Queue '${name}' removed`);
      } else {
         throw new Error(`Queue '${name}' not found`);
      }
   }

   /**
    * Graceful shutdown of all queues
    */
   public async shutdown(): Promise<void> {
      console.log('Shutting down all queues...');

      const shutdownPromises = Array.from(this.queues.values()).map(queue =>
         queue.close().catch((error: any) =>
            console.error('Error closing queue:', error)
         )
      );

      await Promise.all(shutdownPromises);
      this.queues.clear();

      console.log('All queues shut down successfully');
   }

   /**
    * Get Redis connection info
    */
   public async getRedisInfo(): Promise<{
      connected: boolean;
      memoryUsage: any;
      keyCount: number;
   }> {
      try {
         const connected = await this.redisConnection.testConnection();
         const memoryUsage = await this.redisConnection.getMemoryUsage();
         const keyCount = await this.redisConnection.getKeyCount();

         return {
            connected,
            memoryUsage,
            keyCount,
         };
      } catch (error: any) {
         console.error('Failed to get Redis info:', error);
         return {
            connected: false,
            memoryUsage: null,
            keyCount: 0,
         };
      }
   }
}

/**
 * Queue factory for creating specific queues
 */
export class QueueFactory {
   private static queueManager = QueueManager.getInstance();

   /**
    * Get progress calculation queue
    */
   public static getProgressQueue(): Bull.Queue<ProgressCalculationJobData> {
      return this.queueManager.getQueue<ProgressCalculationJobData>('progress-calculation')
         || this.queueManager.createProgressQueue();
   }

   /**
    * Get offline download queue
    */
   public static getDownloadQueue(): Bull.Queue<OfflineDownloadJobData> {
      return this.queueManager.getQueue<OfflineDownloadJobData>('offline-download')
         || this.queueManager.createDownloadQueue();
   }

   /**
    * Get cleanup queue
    */
   public static getCleanupQueue(): Bull.Queue<CleanupJobData> {
      return this.queueManager.getQueue<CleanupJobData>('cleanup')
         || this.queueManager.createCleanupQueue();
   }

   /**
    * Get queue manager instance
    */
   public static getQueueManager(): QueueManager {
      return this.queueManager;
   }
}
