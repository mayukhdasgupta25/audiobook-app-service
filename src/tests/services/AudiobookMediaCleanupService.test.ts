import { PrismaClient } from '@prisma/client';
import { AudiobookMediaCleanupService } from '../../services/AudiobookMediaCleanupService';
import { mediaCleanupService } from '../../services/MediaCleanupService';

jest.mock('../../config/rabbitmq', () => ({
   RabbitMQFactory: {
      getConnection: jest.fn(() => ({
         publishChapterDeletion: jest.fn().mockResolvedValue(true),
      })),
   },
}));

jest.mock('../../services/MediaCleanupService', () => ({
   mediaCleanupService: {
      deleteStoredFiles: jest.fn().mockResolvedValue(undefined),
      deleteStoredFile: jest.fn().mockResolvedValue(undefined),
   },
}));

describe('AudiobookMediaCleanupService', () => {
   let service: AudiobookMediaCleanupService;
   let mockPrisma: {
      audioBook: {
         findUnique: jest.Mock;
         delete: jest.Mock;
      };
   };
   let publishChapterDeletion: jest.Mock;

   beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma = {
         audioBook: {
            findUnique: jest.fn(),
            delete: jest.fn().mockResolvedValue(undefined),
         },
      };
      service = new AudiobookMediaCleanupService(mockPrisma as unknown as PrismaClient);

      const { RabbitMQFactory } = jest.requireMock('../../config/rabbitmq');
      publishChapterDeletion = RabbitMQFactory.getConnection().publishChapterDeletion;
   });

   it('loads chapters, publishes chapter.deleted, and deletes audiobook', async () => {
      mockPrisma.audioBook.findUnique.mockResolvedValue({
         id: 'book-1',
         coverImage: 'uploads/images/audiobooks/cover.jpg',
         chapters: [
            { id: 'ch-1', filePath: 'uploads/audio/ch1.mp3', coverImage: 'uploads/images/chapters/ch1.jpg' },
            { id: 'ch-2', filePath: 'uploads/audio/ch2.mp3', coverImage: 'uploads/images/chapters/ch2.jpg' },
         ],
         offlineDownloads: [{ filePath: 'uploads/downloads/book-1.mp3' }],
      });

      await service.deleteAudiobookWithChapters('book-1');

      expect(publishChapterDeletion).toHaveBeenCalledTimes(2);
      expect(publishChapterDeletion).toHaveBeenCalledWith('ch-1');
      expect(publishChapterDeletion).toHaveBeenCalledWith('ch-2');
      expect(mediaCleanupService.deleteStoredFiles).toHaveBeenCalled();
      expect(mockPrisma.audioBook.delete).toHaveBeenCalledWith({ where: { id: 'book-1' } });
   });

   it('throws when audiobook is not found', async () => {
      mockPrisma.audioBook.findUnique.mockResolvedValue(null);

      await expect(service.deleteAudiobookWithChapters('missing')).rejects.toThrow();
      expect(mockPrisma.audioBook.delete).not.toHaveBeenCalled();
   });
});
