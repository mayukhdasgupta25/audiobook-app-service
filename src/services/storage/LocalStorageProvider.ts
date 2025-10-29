/**
 * Local Storage Provider
 * Implementation of StorageProvider interface for local file system
 */
import fs from 'fs/promises';
import path from 'path';
import { StorageProvider, StorageConfig, FileMetadata } from './StorageProvider';
// import { config } from '../../config/env';

export class LocalStorageProvider implements StorageProvider {
   private basePath: string;

   constructor(storageConfig?: Partial<StorageConfig>) {
      this.basePath = storageConfig?.basePath || path.join(process.cwd(), 'storage');

      // Ensure base directory exists
      this.ensureDirectoryExists(this.basePath);
   }

   /**
    * Ensure directory exists, create if it doesn't
    */
   private async ensureDirectoryExists(dirPath: string): Promise<void> {
      try {
         await fs.access(dirPath);
      } catch {
         await fs.mkdir(dirPath, { recursive: true });
      }
   }

   /**
    * Get full file path
    */
   private getFullPath(filePath: string): string {
      return path.join(this.basePath, filePath);
   }

   /**
    * Upload a file to local storage
    */
   async uploadFile(
      filePath: string,
      fileContent: Buffer,
      contentType?: string,
      metadata?: Record<string, string>
   ): Promise<string> {
      try {
         const fullPath = this.getFullPath(filePath);
         const dirPath = path.dirname(fullPath);

         // Ensure directory exists
         await this.ensureDirectoryExists(dirPath);

         // Write file
         await fs.writeFile(fullPath, fileContent);

         // Write metadata file if provided
         if (metadata && Object.keys(metadata).length > 0) {
            const metadataPath = `${fullPath}.meta`;
            await fs.writeFile(metadataPath, JSON.stringify({
               contentType,
               metadata,
               uploadedAt: new Date().toISOString()
            }));
         }

         return fullPath;
      } catch (error: any) {
         // console.error('Local upload error:', error);
         throw new Error(`Failed to upload file locally: ${error.message}`);
      }
   }

   /**
    * Download a file from local storage
    */
   async downloadFile(filePath: string): Promise<Buffer> {
      try {
         const fullPath = this.getFullPath(filePath);
         return await fs.readFile(fullPath);
      } catch (error: any) {
         if (error.code === 'ENOENT') {
            throw new Error('File not found');
         }
         // console.error('Local download error:', error);
         throw new Error(`Failed to download file locally: ${error.message}`);
      }
   }

   /**
    * Delete a file from local storage
    */
   async deleteFile(filePath: string): Promise<boolean> {
      try {
         const fullPath = this.getFullPath(filePath);
         await fs.unlink(fullPath);

         // Also delete metadata file if it exists
         const metadataPath = `${fullPath}.meta`;
         try {
            await fs.unlink(metadataPath);
         } catch {
            // Metadata file doesn't exist, ignore
         }

         return true;
      } catch (_error: any) {
         // console.error('Local delete error:', _error);
         return false;
      }
   }

   /**
    * Get a public URL for a file (returns file path for local)
    */
   async getFileUrl(filePath: string, _expiresIn?: number): Promise<string> {
      const fullPath = this.getFullPath(filePath);
      return `file://${fullPath}`;
   }

   /**
    * Check if a file exists in local storage
    */
   async fileExists(filePath: string): Promise<boolean> {
      try {
         const fullPath = this.getFullPath(filePath);
         await fs.access(fullPath);
         return true;
      } catch {
         return false;
      }
   }

   /**
    * List files in local storage with a prefix
    */
   async listFiles(prefix: string): Promise<string[]> {
      try {
         const fullPrefixPath = this.getFullPath(prefix);
         const dirPath = path.dirname(fullPrefixPath);

         const files: string[] = [];

         const readDir = async (dir: string, currentPrefix: string): Promise<void> => {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
               const fullPath = path.join(dir, entry.name);
               const relativePath = path.relative(this.basePath, fullPath);

               if (entry.isDirectory()) {
                  await readDir(fullPath, path.join(currentPrefix, entry.name));
               } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
                  if (currentPrefix.startsWith(prefix)) {
                     files.push(relativePath);
                  }
               }
            }
         };

         await readDir(dirPath, '');
         return files;
      } catch (_error: any) {
         // console.error('Local list files error:', _error);
         return [];
      }
   }

   /**
    * Get file metadata from local storage
    */
   async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
      try {
         const fullPath = this.getFullPath(filePath);
         const stats = await fs.stat(fullPath);

         let contentType: string | undefined;
         // let metadata: Record<string, string> = {};

         // Try to read metadata file
         try {
            const metadataPath = `${fullPath}.meta`;
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const parsed = JSON.parse(metadataContent);
            contentType = parsed.contentType;
            // metadata = parsed.metadata || {};
         } catch {
            // No metadata file, use default
            contentType = this.getContentTypeFromExtension(filePath);
         }

         return {
            size: stats.size,
            lastModified: stats.mtime,
            ...(contentType && { contentType }),
            etag: stats.mtime.getTime().toString()
         };
      } catch (error: any) {
         if (error.code === 'ENOENT') {
            return null;
         }
         // console.error('Local metadata error:', error);
         return null;
      }
   }

   /**
    * Copy a file within local storage
    */
   async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
      try {
         const sourceFullPath = this.getFullPath(sourcePath);
         const destinationFullPath = this.getFullPath(destinationPath);
         const destinationDir = path.dirname(destinationFullPath);

         // Ensure destination directory exists
         await this.ensureDirectoryExists(destinationDir);

         // Copy file
         await fs.copyFile(sourceFullPath, destinationFullPath);

         // Copy metadata file if it exists
         const sourceMetadataPath = `${sourceFullPath}.meta`;
         const destinationMetadataPath = `${destinationFullPath}.meta`;

         try {
            await fs.copyFile(sourceMetadataPath, destinationMetadataPath);
         } catch {
            // Metadata file doesn't exist, ignore
         }

         return true;
      } catch (_error: any) {
         // console.error('Local copy error:', _error);
         return false;
      }
   }

   /**
    * Move a file within local storage
    */
   async moveFile(sourcePath: string, destinationPath: string): Promise<boolean> {
      try {
         const copied = await this.copyFile(sourcePath, destinationPath);
         if (copied) {
            return await this.deleteFile(sourcePath);
         }
         return false;
      } catch (_error: any) {
         // console.error('Local move error:', _error);
         return false;
      }
   }

   /**
    * Get content type from file extension
    */
   private getContentTypeFromExtension(filePath: string): string {
      const ext = path.extname(filePath).toLowerCase();

      const contentTypes: Record<string, string> = {
         '.mp3': 'audio/mpeg',
         '.wav': 'audio/wav',
         '.m4a': 'audio/mp4',
         '.aac': 'audio/aac',
         '.ogg': 'audio/ogg',
         '.flac': 'audio/flac',
         '.m3u8': 'application/vnd.apple.mpegurl',
         '.ts': 'video/mp2t',
         '.jpg': 'image/jpeg',
         '.jpeg': 'image/jpeg',
         '.png': 'image/png',
         '.gif': 'image/gif',
         '.webp': 'image/webp'
      };

      return contentTypes[ext] || 'application/octet-stream';
   }

   /**
    * Test local storage connection
    */
   async testConnection(): Promise<boolean> {
      try {
         await fs.access(this.basePath);
         return true;
      } catch (_error: any) {
         // console.error('Local storage connection test failed:', _error);
         return false;
      }
   }

   /**
    * Get storage information
    */
   async getStorageInfo(): Promise<{
      basePath: string;
      totalSize: number;
      fileCount: number;
   }> {
      try {
         let totalSize = 0;
         let fileCount = 0;

         const calculateSize = async (dir: string): Promise<void> => {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
               const fullPath = path.join(dir, entry.name);

               if (entry.isDirectory()) {
                  await calculateSize(fullPath);
               } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
                  const stats = await fs.stat(fullPath);
                  totalSize += stats.size;
                  fileCount++;
               }
            }
         };

         await calculateSize(this.basePath);

         return {
            basePath: this.basePath,
            totalSize,
            fileCount
         };
      } catch (_error: any) {
         // console.error('Local storage info error:', _error);
         return {
            basePath: this.basePath,
            totalSize: 0,
            fileCount: 0
         };
      }
   }
}
