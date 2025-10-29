/**
 * Transcoding Worker
 * RabbitMQ publisher for transcoding jobs
 */
import { RabbitMQFactory } from '../config/rabbitmq';
import { PrismaClient } from '@prisma/client';

export class TranscodingWorker {
   private prisma: PrismaClient;
   private isRunning = false;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Start the transcoding worker
    */
   async start(): Promise<void> {
      if (this.isRunning) {
         console.log('Transcoding worker is already running');
         return;
      }

      try {
         // Initialize RabbitMQ connection
         await RabbitMQFactory.initialize();

         console.log('Transcoding worker started successfully (publisher only)');

         this.isRunning = true;

      } catch (error: any) {
         // console.error('Failed to start transcoding worker:', error);
         throw error;
      }
   }

   /**
    * Stop the transcoding worker
    */
   async stop(): Promise<void> {
      if (!this.isRunning) {
         console.log('Transcoding worker is not running');
         return;
      }

      try {
         await RabbitMQFactory.shutdown();
         this.isRunning = false;
         console.log('Transcoding worker stopped');
      } catch (_error: any) {
         // console.error('Error stopping transcoding worker:', _error);
      }
   }

   /**
    * Get worker statistics
    */
   async getWorkerStats(): Promise<{
      isRunning: boolean;
      recentJobs: any[];
   }> {
      try {
         // Since transcoding jobs are removed, return empty array
         return {
            isRunning: this.isRunning,
            recentJobs: []
         };
      } catch (_error: any) {
         // console.error('Error getting worker stats:', _error);
         return {
            isRunning: this.isRunning,
            recentJobs: []
         };
      }
   }

   /**
    * Test worker functionality
    */
   async testWorker(): Promise<boolean> {
      try {
         // Test RabbitMQ connection (for publishing)
         const rabbitMQ = RabbitMQFactory.getConnection();
         const isConnected = (rabbitMQ as any).isConnected();

         // Test database connection
         await this.prisma.$queryRaw`SELECT 1`;

         console.log('Worker test results:', {
            rabbitMQConnected: isConnected,
            databaseConnected: true
         });

         return isConnected;
      } catch (_error: any) {
         // console.error('Worker test failed:', _error);
         return false;
      }
   }
}

/**
 * Worker factory for easy access
 */
export class TranscodingWorkerFactory {
   private static worker: TranscodingWorker | null = null;

   /**
    * Get worker instance
    */
   public static getWorker(prisma: PrismaClient): TranscodingWorker {
      if (!TranscodingWorkerFactory.worker) {
         TranscodingWorkerFactory.worker = new TranscodingWorker(prisma);
      }
      return TranscodingWorkerFactory.worker;
   }

   /**
    * Start worker
    */
   public static async startWorker(prisma: PrismaClient): Promise<void> {
      const worker = TranscodingWorkerFactory.getWorker(prisma);
      await worker.start();
   }

   /**
    * Stop worker
    */
   public static async stopWorker(): Promise<void> {
      if (TranscodingWorkerFactory.worker) {
         await TranscodingWorkerFactory.worker.stop();
         TranscodingWorkerFactory.worker = null;
      }
   }
}
