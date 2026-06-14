import Redis from 'ioredis';
import { buildCacheInvalidationEvent } from '../constants/cacheQueryKeys';
import { RedisConnection } from '../config/redis';
import { sseLogger } from '../config/logger';
import { APP_SSE_REDIS_CHANNEL, CacheInvalidateEvent } from '../types/domainCacheEvents';

export class DomainEventPublisher {
   private static instance: DomainEventPublisher | null = null;
   private readonly publisher: Redis;

   private constructor() {
      this.publisher = RedisConnection.getInstance().getClient();
   }

   static getInstance(): DomainEventPublisher {
      if (!DomainEventPublisher.instance) {
         DomainEventPublisher.instance = new DomainEventPublisher();
      }
      return DomainEventPublisher.instance;
   }

   async publish(event: CacheInvalidateEvent): Promise<void> {
      try {
         await this.publisher.publish(APP_SSE_REDIS_CHANNEL, JSON.stringify(event));
         sseLogger.info(
            {
               direction: 'published',
               channel: APP_SSE_REDIS_CHANNEL,
               resource: event.resource,
               action: event.action,
               id: event.id,
               queryKeyCount: event.queryKeys.length,
               relatedIds: event.relatedIds,
            },
            'SSE cache-invalidate event published',
         );
      } catch (error) {
         sseLogger.error(
            {
               err: error,
               direction: 'published',
               channel: APP_SSE_REDIS_CHANNEL,
               resource: event.resource,
               action: event.action,
               id: event.id,
            },
            'SSE cache-invalidate event publish failed',
         );
      }
   }

   createSubscriber(): Redis {
      return this.publisher.duplicate();
   }

   static channel(): string {
      return APP_SSE_REDIS_CHANNEL;
   }
}

export const domainEventPublisher = DomainEventPublisher.getInstance();

export function emitCacheInvalidation(
   resource: CacheInvalidateEvent['resource'],
   action: CacheInvalidateEvent['action'],
   id: string,
   relatedIds?: CacheInvalidateEvent['relatedIds'],
): void {
   void domainEventPublisher.publish(buildCacheInvalidationEvent(resource, action, id, relatedIds));
}
