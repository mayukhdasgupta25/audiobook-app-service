/**
 * RabbitMQ consumers for entity deletion events — enqueue Bull cleanup jobs.
 */
import { PrismaClient } from '@prisma/client';
import { RabbitMQFactory } from '../config/rabbitmq';
import { getBackgroundJobService } from '../lib/backgroundJobs';
import { AuthorDeletionMessage } from '../types/author-events';
import { OrganizationDeletionMessage } from '../types/organization-events';
import { UserDeletionMessage } from '../types/user-events';

export class EntityDeletionConsumerWorker {
   private isRunning = false;

   constructor(private prisma: PrismaClient) {}

   async start(): Promise<void> {
      if (this.isRunning) {
         console.log('Entity deletion consumer worker is already running');
         return;
      }

      await RabbitMQFactory.initialize();
      const rabbitMQ = RabbitMQFactory.getConnection();
      const backgroundJobs = getBackgroundJobService(this.prisma);

      await rabbitMQ.consumeUserDeletionMessages(async (message) => {
         const payload = message as UserDeletionMessage;
         if (!payload.userId) {
            return;
         }
         const jobData: Parameters<typeof backgroundJobs.scheduleEntityDeletion>[0] = {
            type: 'user_deletion',
            userId: payload.userId,
         };
         if (payload.authorId) {
            jobData.authorId = payload.authorId;
         }
         await backgroundJobs.scheduleEntityDeletion(jobData);
      });

      await rabbitMQ.consumeAuthorDeletionMessages(async (message) => {
         const payload = message as AuthorDeletionMessage;
         if (!payload.authorId || !payload.userId) {
            return;
         }
         await backgroundJobs.scheduleEntityDeletion({
            type: 'author_deletion',
            authorId: payload.authorId,
            userId: payload.userId,
         });
      });

      await rabbitMQ.consumeOrganizationDeletionMessages(async (message) => {
         const payload = message as OrganizationDeletionMessage;
         if (!payload.organizationId) {
            return;
         }
         await backgroundJobs.scheduleEntityDeletion({
            type: 'organization_deletion',
            organizationId: payload.organizationId,
         });
      });

      this.isRunning = true;
      console.log('Entity deletion consumer worker started successfully');
   }

   async stop(): Promise<void> {
      if (!this.isRunning) {
         return;
      }

      try {
         const rabbitMQ = RabbitMQFactory.getConnection();
         await rabbitMQ.stopConsumingUserDeletionMessages();
         await rabbitMQ.stopConsumingAuthorDeletionMessages();
         await rabbitMQ.stopConsumingOrganizationDeletionMessages();
         this.isRunning = false;
         console.log('Entity deletion consumer worker stopped');
      } catch (_error: unknown) {
         // Swallow stop errors
      }
   }
}

export class EntityDeletionConsumerWorkerFactory {
   private static worker: EntityDeletionConsumerWorker | null = null;

   public static getWorker(prisma: PrismaClient): EntityDeletionConsumerWorker {
      if (!EntityDeletionConsumerWorkerFactory.worker) {
         EntityDeletionConsumerWorkerFactory.worker = new EntityDeletionConsumerWorker(prisma);
      }
      return EntityDeletionConsumerWorkerFactory.worker;
   }

   public static async startWorker(prisma: PrismaClient): Promise<void> {
      const worker = EntityDeletionConsumerWorkerFactory.getWorker(prisma);
      await worker.start();
   }

   public static async stopWorker(): Promise<void> {
      if (EntityDeletionConsumerWorkerFactory.worker) {
         await EntityDeletionConsumerWorkerFactory.worker.stop();
      }
   }
}
