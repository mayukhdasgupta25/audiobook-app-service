/**
 * AWS S3 Storage Provider
 * Implementation of StorageProvider interface for AWS S3
 */
import {
   S3Client,
   PutObjectCommand,
   GetObjectCommand,
   DeleteObjectCommand,
   HeadObjectCommand,
   HeadBucketCommand,
   ListObjectsV2Command,
   CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, StorageConfig, FileMetadata } from './StorageProvider';
import { config } from '../../config/env';

export class S3StorageProvider implements StorageProvider {
   private s3Client: S3Client;
   private bucket: string;

   constructor(storageConfig?: Partial<StorageConfig>) {
      this.s3Client = new S3Client({
         region: config.AWS_S3_REGION,
         ...(config.AWS_S3_ENDPOINT && {
            endpoint: config.AWS_S3_ENDPOINT,
            forcePathStyle: true,
         }),
      });

      this.bucket = storageConfig?.bucket || config.AWS_S3_BUCKET;

      if (!this.bucket) {
         throw new Error('S3 bucket name is required');
      }
   }

   /**
    * Upload a file to S3
    */
   async uploadFile(
      filePath: string,
      fileContent: Buffer,
      contentType?: string,
      metadata?: Record<string, string>
   ): Promise<string> {
      try {
         const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
            Body: fileContent,
            ContentType: contentType || 'application/octet-stream',
            Metadata: metadata || {},
         });

         await this.s3Client.send(command);
         return filePath.replace(/\\/g, '/');
      } catch (error: any) {
         throw new Error(`Failed to upload file to S3: ${error.message}`);
      }
   }

   /**
    * Download a file from S3
    */
   async downloadFile(filePath: string): Promise<Buffer> {
      try {
         const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
         });

         const response = await this.s3Client.send(command);

         if (!response.Body) {
            throw new Error('File not found or empty');
         }

         const chunks: Uint8Array[] = [];
         const reader = response.Body.transformToWebStream().getReader();

         // eslint-disable-next-line no-constant-condition
         while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
         }

         return Buffer.concat(chunks);
      } catch (error: any) {
         if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            throw new Error('File not found');
         }
         throw new Error(`Failed to download file from S3: ${error.message}`);
      }
   }

   /**
    * Delete a file from S3
    */
   async deleteFile(filePath: string): Promise<boolean> {
      try {
         await this.s3Client.send(
            new DeleteObjectCommand({
               Bucket: this.bucket,
               Key: filePath,
            }),
         );
         return true;
      } catch {
         return false;
      }
   }

   /**
    * Presigns a GET URL using AWS SDK v3 (Signature Version 4 only).
    */
   async getFileUrl(filePath: string, expiresIn: number = config.AWS_SIGNED_URL_EXPIRES_IN): Promise<string> {
      try {
         const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
         });

         return await getSignedUrl(this.s3Client, command, { expiresIn });
      } catch (error: any) {
         throw new Error(`Failed to generate file URL: ${error.message}`);
      }
   }

   /**
    * Check if a file exists in S3
    */
   async fileExists(filePath: string): Promise<boolean> {
      try {
         await this.s3Client.send(
            new HeadObjectCommand({
               Bucket: this.bucket,
               Key: filePath,
            }),
         );
         return true;
      } catch (error: any) {
         if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return false;
         }
         return false;
      }
   }

   /**
    * List files in S3 with a prefix
    */
   async listFiles(prefix: string): Promise<string[]> {
      try {
         const response = await this.s3Client.send(
            new ListObjectsV2Command({
               Bucket: this.bucket,
               Prefix: prefix,
            }),
         );

         return response.Contents?.map(obj => obj.Key!).filter(key => key !== undefined) || [];
      } catch {
         return [];
      }
   }

   /**
    * Get file metadata from S3
    */
   async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
      try {
         const response = await this.s3Client.send(
            new HeadObjectCommand({
               Bucket: this.bucket,
               Key: filePath,
            }),
         );

         return {
            size: response.ContentLength || 0,
            lastModified: response.LastModified || new Date(),
            ...(response.ContentType && { contentType: response.ContentType }),
            ...(response.ETag && { etag: response.ETag }),
         };
      } catch (error: any) {
         if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            return null;
         }
         return null;
      }
   }

   /**
    * Copy a file within S3
    */
   async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
      try {
         await this.s3Client.send(
            new CopyObjectCommand({
               Bucket: this.bucket,
               CopySource: `${this.bucket}/${sourcePath}`,
               Key: destinationPath,
            }),
         );
         return true;
      } catch {
         return false;
      }
   }

   /**
    * Move a file within S3 (copy + delete)
    */
   async moveFile(sourcePath: string, destinationPath: string): Promise<boolean> {
      try {
         const copied = await this.copyFile(sourcePath, destinationPath);
         if (copied) {
            return await this.deleteFile(sourcePath);
         }
         return false;
      } catch {
         return false;
      }
   }

   /**
    * Get S3 bucket information
    */
   async getBucketInfo(): Promise<{
      name: string;
      region: string;
      creationDate: Date;
   }> {
      return {
         name: this.bucket,
         region: config.AWS_S3_REGION,
         creationDate: new Date(),
      };
   }

   /**
    * Test S3 connection
    */
   async testConnection(): Promise<boolean> {
      try {
         await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
         return true;
      } catch {
         return false;
      }
   }
}
