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
         // Initialize RabbitMQ connection
         await RabbitMQFactory.initialize();

         // Start consuming user creation messages
         const rabbitMQ = RabbitMQFactory.getConnection();
         await rabbitMQ.consumeUserCreationMessages(this.handleUserCreationMessage.bind(this));

         console.log('User consumer worker started successfully');
         this.isRunning = true;

      } catch (error: any) {
         console.error('Failed to start user consumer worker:', error);
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
      } catch (error: any) {
         console.error('Error stopping user consumer worker:', error);
      }
   }

   /**
    * Handle user creation message
    */
   private async handleUserCreationMessage(message: UserCreationMessage): Promise<void> {
      try {
         console.log(`Processing user creation for userId: ${message.userId}`);

         // Validate message structure
         if (!message.userId || typeof message.userId !== 'string') {
            throw new Error('Invalid message: userId is required and must be a string');
         }

         // Create user profile
         const result = await this.userProfileService.createUserProfile(message.userId);

         if (result.success) {
            console.log(`Successfully created user profile for userId: ${message.userId}, username: ${result.userProfile?.username}`);
         } else {
            console.error(`Failed to create user profile for userId: ${message.userId}, error: ${result.error}`);
         }

      } catch (error: any) {
         console.error(`Error handling user creation message for userId: ${message.userId}:`, error);
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
      } catch (error: any) {
         console.error('Error getting worker stats:', error);
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
         // Test RabbitMQ connection
         const rabbitMQ = RabbitMQFactory.getConnection();
         const rabbitMQConnected = (rabbitMQ as any).isConnected();

         // Test database connection
         await this.prisma.$queryRaw`SELECT 1`;

         // Test user profile service
         const testUserId = `test-user-${Date.now()}`;
         const testResult = await this.userProfileService.createUserProfile(testUserId);

         if (testResult.success && testResult.userProfile) {
            // Clean up test user
            await this.userProfileService.deleteUserProfile(testUserId);
         }

         console.log('User consumer worker test results:', {
            rabbitMQConnected,
            databaseConnected: true,
            userProfileServiceWorking: testResult.success
         });

         return rabbitMQConnected && testResult.success;
      } catch (error: any) {
         console.error('User consumer worker test failed:', error);
         return false;
      }
   }
}

/**
 * User consumer worker factory for easy access
 */
export class UserConsumerWorkerFactory {
   private static worker: UserConsumerWorker | null = null;

   /**
    * Get worker instance
    */
   public static getWorker(prisma: PrismaClient): UserConsumerWorker {
      if (!UserConsumerWorkerFactory.worker) {
         UserConsumerWorkerFactory.worker = new UserConsumerWorker(prisma);
      }
      return UserConsumerWorkerFactory.worker;
   }

   /**
    * Start worker
    */
   public static async startWorker(prisma: PrismaClient): Promise<void> {
      const worker = UserConsumerWorkerFactory.getWorker(prisma);
      await worker.start();
   }

   /**
    * Stop worker
    */
   public static async stopWorker(): Promise<void> {
      if (UserConsumerWorkerFactory.worker) {
         await UserConsumerWorkerFactory.worker.stop();
         UserConsumerWorkerFactory.worker = null;
      }
   }
}
