/**
 * Storage Factory
 * Factory pattern to create appropriate storage provider based on configuration
 */
import { StorageProvider, StorageConfig } from './StorageProvider';
import { S3StorageProvider } from './S3StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { config } from '../../config/env';

export class StorageFactory {
   private static instance: StorageProvider | null = null;

   /**
    * Create storage provider based on configuration
    */
   public static createStorageProvider(storageConfig?: Partial<StorageConfig>): StorageProvider {
      const provider = storageConfig?.provider || config.STORAGE_PROVIDER;

      switch (provider) {
         case 's3':
            return new S3StorageProvider(storageConfig);



         case 'local':
         default:
            return new LocalStorageProvider(storageConfig);
      }
   }

   /**
    * Get singleton storage provider instance
    */
   public static getStorageProvider(): StorageProvider {
      if (!StorageFactory.instance) {
         StorageFactory.instance = StorageFactory.createStorageProvider();
      }
      return StorageFactory.instance;
   }

   /**
    * Reset singleton instance (useful for testing)
    */
   public static resetInstance(): void {
      StorageFactory.instance = null;
   }

   /**
    * Test storage provider connection
    */
   public static async testStorageProvider(provider?: string): Promise<{
      provider: string;
      connected: boolean;
      error?: string;
   }> {
      try {
         const storageConfig: Partial<StorageConfig> = provider ? { provider: provider as any } : {};
         const storageProvider = StorageFactory.createStorageProvider(storageConfig);

         const connected = await storageProvider.testConnection();

         return {
            provider: provider || config.STORAGE_PROVIDER,
            connected,
            ...(connected ? {} : { error: 'Connection test failed' })
         };
      } catch (error: any) {
         return {
            provider: provider || config.STORAGE_PROVIDER,
            connected: false,
            error: error.message
         };
      }
   }

   /**
    * Test all available storage providers
    */
   public static async testAllProviders(): Promise<{
      [provider: string]: {
         connected: boolean;
         error?: string;
      };
   }> {
      const providers = ['local', 's3'];
      const results: any = {};

      for (const provider of providers) {
         const result = await StorageFactory.testStorageProvider(provider);
         results[provider] = {
            connected: result.connected,
            error: result.error
         };
      }

      return results;
   }

   /**
    * Get storage provider configuration info
    */
   public static getStorageConfig(): {
      provider: string;
      config: Partial<StorageConfig>;
   } {
      const provider = config.STORAGE_PROVIDER;

      const configMap: Record<string, Partial<StorageConfig>> = {
         local: {
            provider: 'local',
            basePath: './storage'
         },
         s3: {
            provider: 's3',
            bucket: config.AWS_S3_BUCKET,
            region: config.AWS_S3_REGION,
            accessKeyId: config.AWS_ACCESS_KEY_ID,
            secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            endpoint: config.AWS_S3_ENDPOINT
         },
      };

      return {
         provider,
         config: configMap[provider] || configMap['local'] || {}
      };
   }

   /**
    * Validate storage configuration
    */
   public static validateStorageConfig(provider: string): {
      valid: boolean;
      missingFields: string[];
   } {
      const missingFields: string[] = [];

      switch (provider) {
         case 's3':
            if (!config.AWS_S3_BUCKET) missingFields.push('AWS_S3_BUCKET');
            if (!config.AWS_ACCESS_KEY_ID) missingFields.push('AWS_ACCESS_KEY_ID');
            if (!config.AWS_SECRET_ACCESS_KEY) missingFields.push('AWS_SECRET_ACCESS_KEY');
            break;



         case 'local':
            // Local storage doesn't require additional configuration
            break;

         default:
            missingFields.push('STORAGE_PROVIDER');
      }

      return {
         valid: missingFields.length === 0,
         missingFields
      };
   }
}
