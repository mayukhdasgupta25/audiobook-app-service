import { PrismaClient } from '@prisma/client';
import { EntityDeletionConsumerWorker } from '../../workers/EntityDeletionConsumerWorker';

const mockScheduleEntityDeletion = jest.fn().mockResolvedValue(undefined);

jest.mock('../../config/rabbitmq', () => ({
   RabbitMQFactory: {
      initialize: jest.fn().mockResolvedValue(undefined),
      getConnection: jest.fn(() => ({
         consumeUserDeletionMessages: jest.fn(async (handler: (msg: unknown) => Promise<void>) => {
            await handler({ userId: 'user-1', authorId: 'author-1' });
         }),
         consumeAuthorDeletionMessages: jest.fn(async (handler: (msg: unknown) => Promise<void>) => {
            await handler({ authorId: 'author-1', userId: 'user-1' });
         }),
         consumeOrganizationDeletionMessages: jest.fn(async (handler: (msg: unknown) => Promise<void>) => {
            await handler({ organizationId: 'org-1' });
         }),
         stopConsumingUserDeletionMessages: jest.fn(),
         stopConsumingAuthorDeletionMessages: jest.fn(),
         stopConsumingOrganizationDeletionMessages: jest.fn(),
      })),
   },
}));

jest.mock('../../lib/backgroundJobs', () => ({
   getBackgroundJobService: jest.fn(() => ({
      scheduleEntityDeletion: mockScheduleEntityDeletion,
   })),
}));

describe('EntityDeletionConsumerWorker', () => {
   beforeEach(() => {
      jest.clearAllMocks();
   });

   it('enqueues cleanup jobs for deletion events', async () => {
      const worker = new EntityDeletionConsumerWorker({} as PrismaClient);
      await worker.start();

      expect(mockScheduleEntityDeletion).toHaveBeenCalledWith({
         type: 'user_deletion',
         userId: 'user-1',
         authorId: 'author-1',
      });
      expect(mockScheduleEntityDeletion).toHaveBeenCalledWith({
         type: 'author_deletion',
         authorId: 'author-1',
         userId: 'user-1',
      });
      expect(mockScheduleEntityDeletion).toHaveBeenCalledWith({
         type: 'organization_deletion',
         organizationId: 'org-1',
      });
   });
});
