/**
 * Redis Configuration
 * Handles Redis connection and configuration for Bull queues
 */
import Redis from 'ioredis';
import { config } from './env';
import { redisLogger } from './logger';

export class RedisConnection {
   private static instance: RedisConnection;
   private redis: Redis;

   private constructor(redisUrl: string) {
      this.redis = new Redis(redisUrl, {
         lazyConnect: true,
      });

      this.setupEventHandlers();
   }

   /**
    * Get Redis connection instance
    */
   public static getInstance(): RedisConnection {
      if (!RedisConnection.instance) {
         RedisConnection.instance = new RedisConnection(config.REDIS_URL);
      }

      return RedisConnection.instance;
   }

   /**
    * Get Redis client
    */
   public getClient(): Redis {
      return this.redis;
   }

   /**
    * Setup Redis event handlers
    */
   private setupEventHandlers(): void {
      this.redis.on('connect', () => {
         redisLogger.info('Redis connected successfully');
      });

      this.redis.on('ready', () => {
         redisLogger.info('Redis ready to accept commands');
      });

      this.redis.on('error', (error) => {
         redisLogger.error({ err: error }, 'Redis connection error');
      });

      this.redis.on('close', () => {
         redisLogger.warn('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
         redisLogger.info('Redis reconnecting...');
      });

      this.redis.on('end', () => {
         redisLogger.warn('Redis connection ended');
      });
   }

   /**
    * Test Redis connection
    */
   public async testConnection(): Promise<boolean> {
      try {
         await this.redis.ping();
         return true;
      } catch (error) {
         redisLogger.error({ err: error }, 'Redis connection test failed');
         return false;
      }
   }

   /**
    * Get Redis info
    */
   public async getInfo(): Promise<string> {
      try {
         return await this.redis.info();
      } catch (error) {
         redisLogger.error({ err: error }, 'Failed to get Redis info');
         throw error;
      }
   }

   /**
    * Close Redis connection
    */
   public async close(): Promise<void> {
      try {
         await this.redis.quit();
      } catch (error) {
         redisLogger.error({ err: error }, 'Error closing Redis connection');
      }
   }

   /**
    * Get Redis memory usage
    */
   public async getMemoryUsage(): Promise<{
      usedMemory: string;
      usedMemoryHuman: string;
      usedMemoryRss: string;
      usedMemoryPeak: string;
      usedMemoryPeakHuman: string;
   }> {
      try {
         const info = await this.redis.info('memory');
         const lines = info.split('\r\n');
         const memoryInfo: Record<string, string> = {};

         lines.forEach(line => {
            if (line.includes(':')) {
               const [key, value] = line.split(':');
               if (key) {
                  memoryInfo[key] = value ?? '';
               }
            }
         });

         return {
            usedMemory: memoryInfo['used_memory'] || '0',
            usedMemoryHuman: memoryInfo['used_memory_human'] || '0B',
            usedMemoryRss: memoryInfo['used_memory_rss'] || '0',
            usedMemoryPeak: memoryInfo['used_memory_peak'] || '0',
            usedMemoryPeakHuman: memoryInfo['used_memory_peak_human'] || '0B',
         };
      } catch (error) {
         redisLogger.error({ err: error }, 'Failed to get Redis memory usage');
         throw error;
      }
   }

   /**
    * Get Redis key count
    */
   public async getKeyCount(): Promise<number> {
      try {
         return await this.redis.dbsize();
      } catch (error) {
         redisLogger.error({ err: error }, 'Failed to get Redis key count');
         throw error;
      }
   }

   /**
    * Clear all Redis data (use with caution)
    */
   public async clearAll(): Promise<void> {
      try {
         await this.redis.flushall();
         redisLogger.warn('All Redis data cleared');
      } catch (error) {
         redisLogger.error({ err: error }, 'Failed to clear Redis data');
         throw error;
      }
   }

   /**
    * Clear specific pattern keys
    */
   public async clearPattern(pattern: string): Promise<number> {
      try {
         const keys = await this.redis.keys(pattern);
         if (keys.length > 0) {
            await this.redis.del(...keys);
         }
         return keys.length;
      } catch (error) {
         redisLogger.error({ err: error, pattern }, 'Failed to clear pattern keys');
         throw error;
      }
   }
}

/**
 * Redis configuration helper
 */
export class RedisConfigHelper {
   /**
    * Get Redis URL from application config
    */
   public static getRedisUrl(): string {
      return config.REDIS_URL;
   }
}
