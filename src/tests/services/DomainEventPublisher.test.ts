const mockPublish = jest.fn().mockResolvedValue(1);
const mockDuplicate = jest.fn();

jest.mock('../../config/redis', () => ({
   RedisConnection: {
      getInstance: () => ({
         getClient: () => ({
            publish: mockPublish,
            duplicate: mockDuplicate,
         }),
      }),
   },
}));

jest.mock('../../config/logger', () => ({
   sseLogger: { info: jest.fn(), error: jest.fn() },
}));

import { DomainEventPublisher } from '../../services/DomainEventPublisher';
import { APP_SSE_REDIS_CHANNEL } from '../../types/domainCacheEvents';
import { buildCacheInvalidationEvent } from '../../constants/cacheQueryKeys';
import { sseLogger } from '../../config/logger';

describe('DomainEventPublisher (app)', () => {
   beforeEach(() => {
      mockPublish.mockClear();
   });

   it('publish serializes payload and calls Redis PUBLISH on the app channel', async () => {
      const publisher = DomainEventPublisher.getInstance();
      const event = buildCacheInvalidationEvent('audiobook', 'updated', 'ab-1');

      await publisher.publish(event);

      expect(mockPublish).toHaveBeenCalledWith(APP_SSE_REDIS_CHANNEL, JSON.stringify(event));
   });

   it('logs errors without throwing when publish fails', async () => {
      mockPublish.mockRejectedValueOnce(new Error('redis down'));
      const publisher = DomainEventPublisher.getInstance();
      const event = buildCacheInvalidationEvent('chapter', 'deleted', 'ch-1', { audiobookId: 'ab-1' });

      await expect(publisher.publish(event)).resolves.toBeUndefined();
      expect(sseLogger.error).toHaveBeenCalled();
   });

   it('creates subscriber via duplicate()', () => {
      const duplicateClient = { subscribe: jest.fn() };
      mockDuplicate.mockReturnValueOnce(duplicateClient);

      const publisher = DomainEventPublisher.getInstance();
      expect(publisher.createSubscriber()).toBe(duplicateClient);
      expect(mockDuplicate).toHaveBeenCalled();
   });
});
