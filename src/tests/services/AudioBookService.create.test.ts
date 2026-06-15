import { PrismaClient } from '@prisma/client';
import { AudioBookService } from '../../services/AudioBookService';
import { ApiError } from '../../types/ApiError';
import { ImageAssetService } from '../../services/ImageAssetService';

jest.mock('../../services/ImageAssetService');
jest.mock('../../services/FileUrlService', () => ({
   fileUrlService: {
      resolveAudioBookMedia: jest.fn(async (audiobook: Record<string, unknown>) => audiobook),
   },
}));
jest.mock('../../services/DomainEventPublisher', () => ({
   emitCacheInvalidation: jest.fn(),
}));
jest.mock('../../services/AudioBookOwnerService', () => ({
   AudioBookOwnerService: jest.fn().mockImplementation(() => ({
      resolveOwnerForDto: jest.fn(async (dto: Record<string, unknown>) => dto),
   })),
}));

describe('AudioBookService.createAudioBook cover image validation', () => {
   const mockCreate = jest.fn();
   const mockDelete = jest.fn();
   const mockFindUnique = jest.fn();
   const mockValidateUploadSource = jest.fn();
   const mockGenerateAndStoreVariants = jest.fn();
   let service: AudioBookService;

   const baseCreateData = {
      title: 'Test Audiobook',
      author: 'Test Author',
      owner: { type: 'AUTHOR' as const, id: 'author-1' },
      genreIds: ['genre-1'],
   };

   beforeEach(() => {
      jest.clearAllMocks();

      mockCreate.mockResolvedValue({
         id: 'audiobook-1',
         title: baseCreateData.title,
         author: baseCreateData.author,
         ownerType: 'AUTHOR',
         ownerId: 'author-1',
         language: 'bn',
         isPublic: true,
         isActive: true,
         audiobookTags: [],
         audioBookGenres: [],
      });
      mockFindUnique.mockResolvedValue({
         id: 'audiobook-1',
         title: baseCreateData.title,
         author: baseCreateData.author,
         ownerType: 'AUTHOR',
         ownerId: 'author-1',
         language: 'bn',
         isPublic: true,
         isActive: true,
         audiobookTags: [],
         audioBookGenres: [],
      });

      (ImageAssetService as jest.Mock).mockImplementation(() => ({
         validateUploadSource: mockValidateUploadSource,
         generateAndStoreVariants: mockGenerateAndStoreVariants,
      }));

      const prisma = {
         audioBook: {
            create: mockCreate,
            delete: mockDelete,
            findUnique: mockFindUnique,
            update: jest.fn(),
         },
         audioBookGenre: { create: jest.fn() },
         audioBookTag: { create: jest.fn() },
      } as unknown as PrismaClient;

      service = new AudioBookService(prisma);
   });

   it('rejects invalid cover images before creating an audiobook', async () => {
      mockValidateUploadSource.mockRejectedValue(
         ApiError.validationError('Image must be at least 1400×2000px. Received 100×100px.'),
      );

      await expect(
         service.createAudioBook(baseCreateData, undefined, undefined, '/tmp/invalid-cover.jpg'),
      ).rejects.toMatchObject({
         statusCode: 400,
         message: 'Image must be at least 1400×2000px. Received 100×100px.',
      });

      expect(mockValidateUploadSource).toHaveBeenCalledWith('audiobook', '/tmp/invalid-cover.jpg');
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
   });

   it('rolls back the audiobook when variant generation fails after create', async () => {
      mockValidateUploadSource.mockResolvedValue(undefined);
      mockGenerateAndStoreVariants.mockRejectedValue(new Error('Processing failed'));
      mockDelete.mockResolvedValue({ id: 'audiobook-1' });

      await expect(
         service.createAudioBook(baseCreateData, undefined, undefined, '/tmp/cover.jpg'),
      ).rejects.toMatchObject({
         statusCode: 400,
         message: 'Processing failed',
      });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'audiobook-1' } });
   });
});
