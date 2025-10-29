/**
 * RabbitMQ Configuration
 * Manages RabbitMQ connection and queue setup for audio streaming service
 */
import * as amqp from 'amqplib';
import { config } from './env';

export interface QueueConfig {
   name: string;
   durable: boolean;
   exclusive: boolean;
   autoDelete: boolean;
   arguments?: any;
}

export interface ExchangeConfig {
   name: string;
   type: string;
   durable: boolean;
   autoDelete: boolean;
}

export interface TranscodingJobData {
   chapter: {
      id: string;
      audiobookId: string;
      title: string;
      description?: string;
      chapterNumber: number;
      duration: number;
      filePath: string;
      fileSize: number;
      startPosition: number;
      endPosition: number;
      createdAt: Date;
      updatedAt: Date;
   };
   bitrates: number[];
   priority: 'low' | 'normal' | 'high';
   userId?: string;
   retryCount?: number;
}

export interface TranscodingJobResult {
   chapterId: string;
   bitrate: number;
   status: 'completed' | 'failed';
   playlistUrl?: string;
   segmentsPath?: string;
   errorMessage?: string;
}

export class RabbitMQConnection {
   private static instance: RabbitMQConnection;
   private connection: amqp.Connection | null = null;
   private channel: amqp.Channel | null = null;
   private isConnecting = false;
   private reconnectAttempts = 0;
   private maxReconnectAttempts = 10;
   private reconnectDelay = 5000; // 5 seconds

   private constructor() { }

   /**
    * Get RabbitMQ connection instance
    */
   public static getInstance(): RabbitMQConnection {
      if (!RabbitMQConnection.instance) {
         RabbitMQConnection.instance = new RabbitMQConnection();
      }
      return RabbitMQConnection.instance;
   }

   /**
    * Connect to RabbitMQ
    */
   public async connect(): Promise<void> {
      if (this.connection && this.channel) {
         return;
      }

      if (this.isConnecting) {
         return;
      }

      this.isConnecting = true;

      try {
         console.log('Connecting to RabbitMQ...');
         this.connection = await amqp.connect(config.RABBITMQ_URL) as unknown as amqp.Connection;

         this.connection!.on('error', (_error: Error) => {
            // console.error('RabbitMQ connection error:', _error);
            this.handleConnectionError();
         });

         this.connection!.on('close', () => {
            console.log('RabbitMQ connection closed');
            this.handleConnectionError();
         });

         this.channel = await (this.connection as any).createChannel();

         // Set prefetch to prevent overwhelming workers
         await this.channel!.prefetch(1);

         console.log('Connected to RabbitMQ successfully');
         this.reconnectAttempts = 0;
         this.isConnecting = false;

         // Setup exchanges and queues
         await this.setupExchangesAndQueues();

      } catch (error) {
         // console.error('Failed to connect to RabbitMQ:', error);
         this.isConnecting = false;
         await this.handleConnectionError();
         throw error;
      }
   }

   /**
    * Setup exchanges and queues
    */
   private async setupExchangesAndQueues(): Promise<void> {
      if (!this.channel) {
         throw new Error('Channel not available');
      }

      const queuePrefix = config.RABBITMQ_QUEUE_PREFIX;

      // Delete existing queues to avoid PRECONDITION_FAILED errors
      // This is necessary when queue arguments change (like removing dead letter exchange)
      const existingQueues = ['priority', 'normal', 'low', 'failed'];
      for (const queue of existingQueues) {
         try {
            await this.channel.deleteQueue(`${queuePrefix}.transcode.${queue}`, { ifEmpty: false });
            console.log(`Deleted existing queue: ${queuePrefix}.transcode.${queue}`);
         } catch (_error: any) {
            // Queue might not exist, which is fine
            // console.error(`Error deleting queue: ${queuePrefix}.transcode.${queue}: ${_error.message}`);
         }
      }

      // Main transcoding exchange
      await this.channel.assertExchange('transcoding.exchange', 'direct', {
         durable: true,
         autoDelete: false
      });

      // Priority queue for high-priority transcoding jobs
      await this.channel.assertQueue(`${queuePrefix}.transcode.priority`, {
         durable: true,
         exclusive: false,
         autoDelete: false,
         arguments: {
            'x-message-ttl': 3600000 // 1 hour TTL
         }
      });

      // Normal queue for regular transcoding jobs
      await this.channel.assertQueue(`${queuePrefix}.transcode.normal`, {
         durable: true,
         exclusive: false,
         autoDelete: false,
         arguments: {
            'x-message-ttl': 3600000 // 1 hour TTL
         }
      });

      // Low priority queue for background transcoding
      await this.channel.assertQueue(`${queuePrefix}.transcode.low`, {
         durable: true,
         exclusive: false,
         autoDelete: false,
         arguments: {
            'x-message-ttl': 7200000 // 2 hours TTL
         }
      });

      // Bind queues to exchange
      await this.channel.bindQueue(`${queuePrefix}.transcode.priority`, 'transcoding.exchange', 'priority');
      await this.channel.bindQueue(`${queuePrefix}.transcode.normal`, 'transcoding.exchange', 'normal');
      await this.channel.bindQueue(`${queuePrefix}.transcode.low`, 'transcoding.exchange', 'low');

      // Setup users exchange and queue for user creation events
      await this.setupUsersExchangeAndQueue(queuePrefix);

      console.log('RabbitMQ exchanges and queues setup completed');
   }

   /**
    * Setup users exchange and queue for user creation events
    */
   private async setupUsersExchangeAndQueue(queuePrefix: string): Promise<void> {
      if (!this.channel) {
         throw new Error('Channel not available');
      }

      // Users exchange (topic type)
      await this.channel.assertExchange('users', 'topic', {
         durable: true,
         autoDelete: false
      });

      // User creation queue
      await this.channel.assertQueue(`${queuePrefix}.users.created`, {
         durable: true,
         exclusive: false,
         autoDelete: false,
         arguments: {
            'x-message-ttl': 3600000 // 1 hour TTL
         }
      });

      // Bind queue to exchange with routing key
      await this.channel.bindQueue(`${queuePrefix}.users.created`, 'users', 'user.created');

      console.log('Users exchange and queue setup completed');
   }





   /**
    * Publish transcoding job
    */
   public async publishTranscodingJob(
      jobData: TranscodingJobData,
      priority: 'low' | 'normal' | 'high' = 'normal'
   ): Promise<boolean> {
      if (!this.channel) {
         throw new Error('Channel not available');
      }

      const routingKey = priority;
      // const queueName = `${config.RABBITMQ_QUEUE_PREFIX}.transcode.${priority}`;

      try {
         const message = Buffer.from(JSON.stringify({
            ...jobData,
            priority,
            timestamp: new Date().toISOString(),
            retryCount: jobData.retryCount || 0
         }));

         const published = this.channel.publish(
            'transcoding.exchange',
            routingKey,
            message,
            {
               persistent: true,
               priority: priority === 'high' ? 10 : priority === 'normal' ? 5 : 1,
               messageId: `${jobData.chapter.id}-${Date.now()}`
            }
         );

         if (published) {
            console.log(`Transcoding job published for chapter ${jobData.chapter.id} with priority ${priority}`);
            return true;
         } else {
            // console.error('Failed to publish transcoding job - channel buffer full');
            return false;
         }
      } catch (_error) {
         // console.error('Error publishing transcoding job:', _error);
         return false;
      }
   }

   /**
    * Get queue statistics
    */
   public async getQueueStats(): Promise<{
      [queueName: string]: {
         messageCount: number;
         consumerCount: number;
      };
   }> {
      if (!this.channel) {
         throw new Error('Channel not available');
      }

      const stats: any = {};
      const queuePrefix = config.RABBITMQ_QUEUE_PREFIX;
      const queues = ['priority', 'normal', 'low'];

      for (const queue of queues) {
         try {
            const queueInfo = await this.channel.checkQueue(`${queuePrefix}.transcode.${queue}`);
            stats[queue] = {
               messageCount: queueInfo.messageCount,
               consumerCount: queueInfo.consumerCount
            };
         } catch (_error) {
            // console.error(`Error getting stats for queue ${queue}:`, _error);
            stats[queue] = {
               messageCount: 0,
               consumerCount: 0
            };
         }
      }

      return stats;
   }

   /**
    * Handle connection errors and implement reconnection logic
    */
   private async handleConnectionError(): Promise<void> {
      this.connection = null;
      this.channel = null;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
         // console.error('Max reconnection attempts reached. Stopping reconnection attempts.');
         return;
      }

      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      console.log(`Attempting to reconnect to RabbitMQ in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(async () => {
         try {
            await this.connect();
         } catch (_error) {
            // console.error('Reconnection attempt failed:', _error);
         }
      }, delay);
   }

   /**
    * Close connection gracefully
    */
   public async close(): Promise<void> {
      try {
         if (this.channel) {
            await this.channel.close();
            this.channel = null;
         }

         if (this.connection) {
            await (this.connection as any).close();
            this.connection = null;
         }

         console.log('RabbitMQ connection closed gracefully');
      } catch (_error) {
         // console.error('Error closing RabbitMQ connection:', _error);
      }
   }

   /**
    * Consume user creation messages
    */
   public async consumeUserCreationMessages(
      onMessage: (message: any) => Promise<void>
   ): Promise<void> {
      if (!this.channel) {
         throw new Error('Channel not available');
      }

      const queuePrefix = config.RABBITMQ_QUEUE_PREFIX;
      const queueName = `${queuePrefix}.users.created`;

      try {
         await this.channel.consume(queueName, async (msg) => {
            if (!msg) {
               return;
            }

            try {
               // Parse message content
               const messageContent = JSON.parse(msg.content.toString());
               console.log(`Received user creation message:`, messageContent);

               // Process the message
               await onMessage(messageContent);

               // Acknowledge message
               this.channel!.ack(msg);
               console.log(`Processed user creation message for userId: ${messageContent.userId}`);
            } catch (_error: any) {
               // console.error('Error processing user creation message:', _error);

               // Log error and acknowledge message (no retry/DLQ as per requirements)
               this.channel!.ack(msg);
            }
         }, {
            noAck: false
         });

         console.log(`Started consuming user creation messages from queue: ${queueName}`);
      } catch (error: any) {
         // console.error('Error setting up user creation message consumer:', error);
         throw error;
      }
   }

   /**
    * Stop consuming user creation messages
    */
   public async stopConsumingUserCreationMessages(): Promise<void> {
      if (!this.channel) {
         return;
      }

      const queuePrefix = config.RABBITMQ_QUEUE_PREFIX;
      const queueName = `${queuePrefix}.users.created`;

      try {
         await this.channel.cancel(queueName);
         console.log(`Stopped consuming user creation messages from queue: ${queueName}`);
      } catch (_error: any) {
         // console.error('Error stopping user creation message consumer:', _error);
      }
   }
}

/**
 * RabbitMQ factory for easy access
 */
export class RabbitMQFactory {
   private static connection = RabbitMQConnection.getInstance();

   /**
    * Get RabbitMQ connection instance
    */
   public static getConnection(): RabbitMQConnection {
      return this.connection;
   }

   /**
    * Initialize RabbitMQ connection
    */
   public static async initialize(): Promise<void> {
      await this.connection.connect();
   }

   /**
    * Close RabbitMQ connection
    */
   public static async shutdown(): Promise<void> {
      await this.connection.close();
   }
}
