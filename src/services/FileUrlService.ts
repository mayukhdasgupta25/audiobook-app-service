/**
 * Resolves stored file paths/keys to client-facing URLs.
 * Development: returns local /uploads/... paths.
 * Non-development: returns AWS presigned GET URLs.
 */
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { getFileUrl } from '../middleware/UploadMiddleware';
import { StorageFactory } from './storage/StorageFactory';
import { AudioBookDto } from '../models/AudioBookDto';
import { UserProfileDto } from '../models/UserDto';
import { ChapterWithRelations } from '../models/ChapterDto';

export type ImageKeyDirectory =
   | 'uploads/images/audiobooks'
   | 'uploads/images/chapters'
   | 'uploads/images/authors'
   | 'uploads/images/users'
   | 'uploads/images/organizations';

export class FileUrlService {
   shouldSignUrls(): boolean {
      return config.NODE_ENV !== 'development';
   }

   /**
    * Decode a stored value or URL into an S3 object key, if applicable.
    */
   normalizeToS3Key(stored: string): string | null {
      const trimmed = stored.trim();
      if (!trimmed) {
         return null;
      }

      if (trimmed.startsWith('file://')) {
         return null;
      }

      if (trimmed.startsWith('/uploads/')) {
         return trimmed.slice(1);
      }

      if (trimmed.startsWith('uploads/')) {
         return trimmed.replace(/\\/g, '/');
      }

      if (/^https?:\/\//i.test(trimmed)) {
         return this.extractKeyFromHttpUrl(trimmed);
      }

      // Legacy absolute filesystem paths from multer — not signable
      if (path.isAbsolute(trimmed) || /^[A-Za-z]:\\/.test(trimmed)) {
         return null;
      }

      return trimmed.replace(/\\/g, '/');
   }

   private extractKeyFromHttpUrl(urlString: string): string | null {
      try {
         const url = new URL(urlString);
         const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

         if (config.AWS_S3_BUCKET && pathname.startsWith(`${config.AWS_S3_BUCKET}/`)) {
            return pathname.slice(config.AWS_S3_BUCKET.length + 1);
         }

         if (config.AWS_S3_ENDPOINT) {
            const endpointHost = new URL(config.AWS_S3_ENDPOINT).host;
            if (url.host === endpointHost && pathname.startsWith(`${config.AWS_S3_BUCKET}/`)) {
               return pathname.slice(config.AWS_S3_BUCKET.length + 1);
            }
         }

         // Virtual-hosted-style: bucket.s3.region.amazonaws.com/key
         if (url.hostname.startsWith(`${config.AWS_S3_BUCKET}.`)) {
            return pathname;
         }

         return null;
      } catch {
         return null;
      }
   }

   private isExternalHttpUrl(value: string): boolean {
      if (!/^https?:\/\//i.test(value)) {
         return false;
      }
      return this.normalizeToS3Key(value) === null;
   }

   async resolveForClient(stored?: string | null): Promise<string | undefined> {
      if (!stored) {
         return undefined;
      }

      const trimmed = stored.trim();
      if (!trimmed) {
         return undefined;
      }

      if (this.isExternalHttpUrl(trimmed)) {
         return trimmed;
      }

      if (!this.shouldSignUrls()) {
         if (trimmed.startsWith('/uploads/')) {
            return trimmed;
         }
         return getFileUrl(trimmed);
      }

      const key = this.normalizeToS3Key(trimmed);
      if (!key) {
         return trimmed;
      }

      const storageProvider = StorageFactory.getStorageProvider();
      return storageProvider.getFileUrl(key, config.AWS_SIGNED_URL_EXPIRES_IN);
   }

   async resolveManyForClient(
      values: (string | undefined | null)[]
   ): Promise<(string | undefined)[]> {
      return Promise.all(values.map(value => this.resolveForClient(value)));
   }

   async uploadLocalFileToStorage(
      localPath: string,
      s3Key: string,
      contentType: string
   ): Promise<string> {
      const fileBuffer = fs.readFileSync(localPath);
      const storageProvider = StorageFactory.getStorageProvider();
      await storageProvider.uploadFile(s3Key, fileBuffer, contentType);
      return s3Key.replace(/\\/g, '/');
   }

   /**
    * Process a multer-saved image: dev → /uploads/ URL; non-dev → S3 key.
    */
   async processUploadedImageFile(
      localPath: string,
      keyDirectory: ImageKeyDirectory,
      contentType = 'image/jpeg',
      filenamePrefix = 'image'
   ): Promise<string> {
      if (!this.shouldSignUrls()) {
         return getFileUrl(localPath);
      }

      const ext = path.extname(localPath) || '.jpg';
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const s3Key = `${keyDirectory}/${filenamePrefix}-${uniqueSuffix}${ext}`;

      return this.uploadLocalFileToStorage(localPath, s3Key, contentType);
   }

   /**
    * Process a multer-saved cover image: dev → /uploads/ URL; non-dev → S3 key.
    */
   async processUploadedCoverFile(
      localPath: string,
      keyDirectory: 'uploads/images/audiobooks' | 'uploads/images/chapters',
      contentType = 'image/jpeg'
   ): Promise<string> {
      return this.processUploadedImageFile(localPath, keyDirectory, contentType, 'cover');
   }

   async resolveAudioBookMedia<T extends AudioBookDto>(dto: T): Promise<T> {
      const coverImage = await this.resolveForClient(dto.coverImage);
      return {
         ...dto,
         coverImage,
      };
   }

   async resolveAudioBookMediaList<T extends AudioBookDto>(dtos: T[]): Promise<T[]> {
      return Promise.all(dtos.map(dto => this.resolveAudioBookMedia(dto)));
   }

   async resolveChapterMedia(chapter: ChapterWithRelations): Promise<ChapterWithRelations> {
      const [
         filePath,
         coverImage,
         chapterCardCoverImage,
         maximizedChapterCoverImage,
         minimizedChapterCoverImage,
      ] = await this.resolveManyForClient([
         chapter.filePath,
         chapter.coverImage,
         chapter.chapterCardCoverImage,
         chapter.maximizedChapterCoverImage,
         chapter.minimizedChapterCoverImage,
      ]);

      return {
         ...chapter,
         filePath: filePath ?? chapter.filePath,
         coverImage: coverImage ?? chapter.coverImage,
         ...(chapterCardCoverImage !== undefined && { chapterCardCoverImage }),
         ...(maximizedChapterCoverImage !== undefined && { maximizedChapterCoverImage }),
         ...(minimizedChapterCoverImage !== undefined && { minimizedChapterCoverImage }),
      };
   }

   async resolveChapterMediaList(chapters: ChapterWithRelations[]): Promise<ChapterWithRelations[]> {
      return Promise.all(chapters.map(chapter => this.resolveChapterMedia(chapter)));
   }

   async resolveNestedAudiobookCoverImage(
      audiobook: { coverImage?: string | null }
   ): Promise<{ coverImage?: string | null }> {
      const coverImage = await this.resolveForClient(audiobook.coverImage);
      if (coverImage === undefined) {
         return {};
      }
      return { coverImage };
   }

   async resolveUserMedia<T extends Pick<UserProfileDto, 'avatar'>>(dto: T): Promise<T> {
      const avatar = await this.resolveForClient(dto.avatar);
      return {
         ...dto,
         avatar,
      };
   }

   private resolveDevAuthorProfileImage(stored: string): string {
      const key = this.normalizeToS3Key(stored);
      if (!key) {
         return stored;
      }

      const relativeFromUploads = key.startsWith('uploads/') ? key.slice('uploads/'.length) : key;
      const localFilePath = path.join(path.resolve(config.DEV_UPLOAD_DIR), relativeFromUploads);

      if (fs.existsSync(localFilePath)) {
         if (stored.startsWith('/uploads/')) {
            return stored;
         }
         return `/${key}`;
      }

      const urlPath = `/${key}`;
      return `${config.AUTH_SERVICE_URL.replace(/\/$/, '')}${urlPath}`;
   }

   async resolveAuthorProfileMedia<T extends { avatar?: string | null }>(dto: T): Promise<T> {
      let avatar: string | undefined;

      if (dto.avatar) {
         avatar = this.shouldSignUrls()
            ? await this.resolveForClient(dto.avatar)
            : this.resolveDevAuthorProfileImage(dto.avatar);
      }

      return {
         ...dto,
         avatar: avatar ?? dto.avatar ?? null,
      };
   }
}

export const fileUrlService = new FileUrlService();
