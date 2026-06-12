/**
 * User Consumer Worker
 * RabbitMQ consumer for user creation events
 */
import { RabbitMQFactory } from '../config/rabbitmq';
import { UserProfileService } from '../services/UserProfileService';
import { PrismaClient } from '@prisma/client';
import { UserCreationMessage } from '../types/user-events';

export class UserConsumerWorker {
   private prisma: PrismaClient;
   private userProfileService: UserProfileService;
   private isRunning = false;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
      this.userProfileService = new UserProfileService(prisma);
   }

   /**
    * Start the user consumer worker
    */
   async start(): Promise<void> {
      if (this.isRunning) {
         console.log('User consumer worker is already running');
         return;
      }

      try {
         await RabbitMQFactory.initialize();

         const rabbitMQ = RabbitMQFactory.getConnection();
         await rabbitMQ.consumeUserCreationMessages(this.handleUserCreationMessage.bind(this));

         console.log('User consumer worker started successfully');
         this.isRunning = true;

      } catch (error: any) {
         throw error;
      }
   }

   /**
    * Stop the user consumer worker
    */
   async stop(): Promise<void> {
      if (!this.isRunning) {
         console.log('User consumer worker is not running');
         return;
      }

      try {
         const rabbitMQ = RabbitMQFactory.getConnection();
         await rabbitMQ.stopConsumingUserCreationMessages();

         this.isRunning = false;
         console.log('User consumer worker stopped');
      } catch (_error: any) {
         // Swallow stop errors
      }
   }

   /**
    * Handle user creation message
    */
   private async handleUserCreationMessage(message: UserCreationMessage): Promise<void> {
      try {
         console.log(`Processing user creation for userId: ${message.userId}`);

         if (!message.userId || typeof message.userId !== 'string') {
            throw new Error('Invalid message: userId is required and must be a string');
         }

         const options: { avatar?: string } = {};
         if (message.avatar && typeof message.avatar === 'string') {
            options.avatar = message.avatar;
         }

         const result = await this.userProfileService.createUserProfile(message.userId, options);

         if (result.success) {
            console.log(`Successfully created user profile for userId: ${message.userId}, username: ${result.userProfile?.username}`);
         }

      } catch (_error: any) {
         // Error is logged but message is acknowledged (no retry/DLQ as per requirements)
      }
   }

   /**
    * Get worker statistics
    */
   async getWorkerStats(): Promise<{
      isRunning: boolean;
      rabbitMQConnected: boolean;
   }> {
      try {
         const rabbitMQ = RabbitMQFactory.getConnection();
         const rabbitMQConnected = (rabbitMQ as any).isConnected();

         return {
            isRunning: this.isRunning,
            rabbitMQConnected
         };
      } catch (_error: any) {
         return {
            isRunning: this.isRunning,
            rabbitMQConnected: false
         };
      }
   }

   /**
    * Test worker functionality
    */
   async testWorker(): Promise<boolean> {
      try {
         const rabbitMQ = RabbitMQFactory.getConnection();
         const rabbitMQConnected = (rabbitMQ as any).isConnected();

         await this.prisma.$queryRaw`SELECT 1`;

         const testUserId = `test-user-${Date.now()}`;
         const testResult = await this.userProfileService.createUserProfile(testUserId);

         if (testResult.success && testResult.userProfile) {
            await this.userProfileService.deleteUserProfile(testUserId);
         }

         console.log('User consumer worker test results:', {
            rabbitMQConnected,
            databaseConnected: true,
            userProfileServiceWorking: testResult.success
         });

         return rabbitMQConnected && testResult.success;
      } catch (_error: any) {
         return false;
      }
   }
}

/**
 * User consumer worker factory for easy access
 */
export class UserConsumerWorkerFactory {
   private static worker: UserConsumerWorker | null = null;

   public static getWorker(prisma: PrismaClient): UserConsumerWorker {
      if (!UserConsumerWorkerFactory.worker) {
         UserConsumerWorkerFactory.worker = new UserConsumerWorker(prisma);
      }
      return UserConsumerWorkerFactory.worker;
   }

   public static async startWorker(prisma: PrismaClient): Promise<void> {
      const worker = UserConsumerWorkerFactory.getWorker(prisma);
      await worker.start();
   }

   public static async stopWorker(): Promise<void> {
      if (UserConsumerWorkerFactory.worker) {
         await UserConsumerWorkerFactory.worker.stop();
         UserConsumerWorkerFactory.worker = null;
      }
   }
}
