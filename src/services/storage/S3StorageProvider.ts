/**
 * AWS S3 Storage Provider
 * Implementation of StorageProvider interface for AWS S3
 */
import AWS from 'aws-sdk';
import { StorageProvider, StorageConfig, FileMetadata } from './StorageProvider';
import { config } from '../../config/env';

export class S3StorageProvider implements StorageProvider {
   private s3: AWS.S3;
   private bucket: string;

   constructor(storageConfig?: Partial<StorageConfig>) {
      // Configure AWS SDK
      AWS.config.update({
         accessKeyId: config.AWS_ACCESS_KEY_ID,
         secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
         region: config.AWS_S3_REGION
      });

      this.s3 = new AWS.S3({
         ...(config.AWS_S3_ENDPOINT && { endpoint: config.AWS_S3_ENDPOINT }),
         s3ForcePathStyle: !!config.AWS_S3_ENDPOINT // Required for S3-compatible services
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
         const params: AWS.S3.PutObjectRequest = {
            Bucket: this.bucket,
            Key: filePath,
            Body: fileContent,
            ContentType: contentType || 'application/octet-stream',
            Metadata: metadata || {}
         };

         const result = await this.s3.upload(params).promise();
         return result.Location;
      } catch (error: any) {
         console.error('S3 upload error:', error);
         throw new Error(`Failed to upload file to S3: ${error.message}`);
      }
   }

   /**
    * Download a file from S3
    */
   async downloadFile(filePath: string): Promise<Buffer> {
      try {
         const params: AWS.S3.GetObjectRequest = {
            Bucket: this.bucket,
            Key: filePath
         };

         const result = await this.s3.getObject(params).promise();

         if (!result.Body) {
            throw new Error('File not found or empty');
         }

         return result.Body as Buffer;
      } catch (error: any) {
         if (error.code === 'NoSuchKey') {
            throw new Error('File not found');
         }
         console.error('S3 download error:', error);
         throw new Error(`Failed to download file from S3: ${error.message}`);
      }
   }

   /**
    * Delete a file from S3
    */
   async deleteFile(filePath: string): Promise<boolean> {
      try {
         const params: AWS.S3.DeleteObjectRequest = {
            Bucket: this.bucket,
            Key: filePath
         };

         await this.s3.deleteObject(params).promise();
         return true;
      } catch (error: any) {
         console.error('S3 delete error:', error);
         return false;
      }
   }

   /**
    * Get a public URL for a file
    */
   async getFileUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
      try {
         const params: any = {
            Bucket: this.bucket,
            Key: filePath,
            Expires: expiresIn
         };

         return this.s3.getSignedUrl('getObject', params);
      } catch (error: any) {
         console.error('S3 URL generation error:', error);
         throw new Error(`Failed to generate file URL: ${error.message}`);
      }
   }

   /**
    * Check if a file exists in S3
    */
   async fileExists(filePath: string): Promise<boolean> {
      try {
         const params: AWS.S3.HeadObjectRequest = {
            Bucket: this.bucket,
            Key: filePath
         };

         await this.s3.headObject(params).promise();
         return true;
      } catch (error: any) {
         if (error.code === 'NotFound') {
            return false;
         }
         console.error('S3 file exists check error:', error);
         return false;
      }
   }

   /**
    * List files in S3 with a prefix
    */
   async listFiles(prefix: string): Promise<string[]> {
      try {
         const params: AWS.S3.ListObjectsV2Request = {
            Bucket: this.bucket,
            Prefix: prefix
         };

         const result = await this.s3.listObjectsV2(params).promise();

         return result.Contents?.map(obj => obj.Key!).filter(key => key !== undefined) || [];
      } catch (error: any) {
         console.error('S3 list files error:', error);
         return [];
      }
   }

   /**
    * Get file metadata from S3
    */
   async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
      try {
         const params: AWS.S3.HeadObjectRequest = {
            Bucket: this.bucket,
            Key: filePath
         };

         const result = await this.s3.headObject(params).promise();

         return {
            size: result.ContentLength || 0,
            lastModified: result.LastModified || new Date(),
            ...(result.ContentType && { contentType: result.ContentType }),
            ...(result.ETag && { etag: result.ETag })
         };
      } catch (error: any) {
         if (error.code === 'NotFound') {
            return null;
         }
         console.error('S3 metadata error:', error);
         return null;
      }
   }

   /**
    * Copy a file within S3
    */
   async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
      try {
         const params: AWS.S3.CopyObjectRequest = {
            Bucket: this.bucket,
            CopySource: `${this.bucket}/${sourcePath}`,
            Key: destinationPath
         };

         await this.s3.copyObject(params).promise();
         return true;
      } catch (error: any) {
         console.error('S3 copy error:', error);
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
      } catch (error: any) {
         console.error('S3 move error:', error);
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
      try {
         // const result = await this.s3.headBucket({ Bucket: this.bucket }).promise();

         return {
            name: this.bucket,
            region: config.AWS_S3_REGION,
            creationDate: new Date() // S3 doesn't return creation date in headBucket
         };
      } catch (error: any) {
         console.error('S3 bucket info error:', error);
         throw new Error(`Failed to get bucket info: ${error.message}`);
      }
   }

   /**
    * Test S3 connection
    */
   async testConnection(): Promise<boolean> {
      try {
         await this.s3.headBucket({ Bucket: this.bucket }).promise();
         return true;
      } catch (error: any) {
         console.error('S3 connection test failed:', error);
         return false;
      }
   }
}
