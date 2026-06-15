import fs from 'fs';
import { FileUploadService } from '../../services/FileUploadService';
import { StorageFactory } from '../../services/storage/StorageFactory';

const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();
const mockFileExists = jest.fn();
const mockGetFileMetadata = jest.fn();

jest.mock('../../config/env', () => ({
   config: {
      NODE_ENV: 'testing',
      STREAMING_SERVICE_STORAGE_PATH: './storage',
   },
}));

jest.mock('../../services/storage/StorageFactory', () => ({
   StorageFactory: {
      getStorageProvider: jest.fn(() => ({
         uploadFile: mockUploadFile,
         deleteFile: mockDeleteFile,
         fileExists: mockFileExists,
         getFileMetadata: mockGetFileMetadata,
      })),
   },
}));

jest.mock('../../services/FileUrlService', () => ({
   fileUrlService: {
      normalizeToS3Key: jest.fn((stored: string) => {
         if (stored.startsWith('/uploads/')) {
            return stored.slice(1);
         }
         if (stored.startsWith('uploads/')) {
            return stored;
         }
         return null;
      }),
   },
}));

describe('FileUploadService non-development storage keys', () => {
   let service: FileUploadService;

   beforeEach(() => {
      jest.clearAllMocks();
      mockUploadFile.mockResolvedValue('uploads/chapters/audio-1.mp3');
      service = new FileUploadService();
      expect(StorageFactory.getStorageProvider).toHaveBeenCalled();
   });

   it('uploads chapter audio with a normalized S3 key and returns a /uploads/... db path', async () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('audio'));
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => undefined);

      const result = await service.uploadFile(
         {
            path: '/tmp/audio.mp3',
            originalname: 'chapter.mp3',
            mimetype: 'audio/mpeg',
            size: 128,
         } as Express.Multer.File,
         '/uploads/chapters',
      );

      expect(mockUploadFile).toHaveBeenCalledWith(
         expect.stringMatching(/^uploads\/chapters\/audio-\d+-\d+\.mp3$/),
         expect.any(Buffer),
         'audio/mpeg',
         expect.any(Object),
      );
      expect(mockUploadFile.mock.calls[0]![0]).not.toMatch(/^\//);
      expect(result.filePath).toMatch(/^\/uploads\/chapters\/audio-\d+-\d+\.mp3$/);
   });

   it('normalizes stored paths before delete, exists, and metadata checks', async () => {
      await service.deleteFile('/uploads/chapters/audio-1.mp3');
      await service.fileExists('/uploads/chapters/audio-1.mp3');
      await service.getFileMetadata('/uploads/chapters/audio-1.mp3');

      expect(mockDeleteFile).toHaveBeenCalledWith('uploads/chapters/audio-1.mp3');
      expect(mockFileExists).toHaveBeenCalledWith('uploads/chapters/audio-1.mp3');
      expect(mockGetFileMetadata).toHaveBeenCalledWith('uploads/chapters/audio-1.mp3');
   });
});
