import { PrismaClient } from '@prisma/client';
import { AudiobookMediaCleanupService } from '../../services/AudiobookMediaCleanupService';
import { mediaCleanupService } from '../../services/MediaCleanupService';

const mockPublishChapterDeletion = jest.fn().mockResolvedValue(true);

jest.mock('../../config/rabbitmq', () => ({
   RabbitMQFactory: {
      getConnection: jest.fn(() => ({
         publishChapterDeletion: mockPublishChapterDeletion,
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
      mockPublishChapterDeletion.mockResolvedValue(true);
      publishChapterDeletion = mockPublishChapterDeletion;
      mockPrisma = {
         audioBook: {
            findUnique: jest.fn(),
            delete: jest.fn().mockResolvedValue(undefined),
         },
      };
      service = new AudiobookMediaCleanupService(mockPrisma as unknown as PrismaClient);
   });

   it('loads chapters, publishes chapter.deleted, and deletes audiobook', async () => {
      mockPrisma.audioBook.findUnique.mockResolvedValue({
         id: 'book-1',
         coverImage: 'uploads/images/audiobooks/cover.jpg',
         chapters: [
            {
               id: 'ch-1',
               filePath: 'uploads/audio/ch1.mp3',
               coverImage: 'uploads/images/chapters/ch1.jpg',
               chapterCardCoverImage: 'uploads/images/chapters/ch1-card.jpg',
               maximizedChapterCoverImage: 'uploads/images/chapters/ch1-max.jpg',
               minimizedChapterCoverImage: 'uploads/images/chapters/ch1-min.jpg',
            },
            {
               id: 'ch-2',
               filePath: 'uploads/audio/ch2.mp3',
               coverImage: 'uploads/images/chapters/ch2.jpg',
               chapterCardCoverImage: null,
               maximizedChapterCoverImage: null,
               minimizedChapterCoverImage: null,
            },
         ],
         offlineDownloads: [{ filePath: 'uploads/downloads/book-1.mp3' }],
      });

      await service.deleteAudiobookWithChapters('book-1');

      expect(publishChapterDeletion).toHaveBeenCalledTimes(2);
      expect(publishChapterDeletion).toHaveBeenCalledWith('ch-1');
      expect(publishChapterDeletion).toHaveBeenCalledWith('ch-2');
      expect(mediaCleanupService.deleteStoredFiles).toHaveBeenCalledWith([
         'uploads/audio/ch1.mp3',
         'uploads/images/chapters/ch1.jpg',
         'uploads/images/chapters/ch1-card.jpg',
         'uploads/images/chapters/ch1-max.jpg',
         'uploads/images/chapters/ch1-min.jpg',
      ]);
      expect(mediaCleanupService.deleteStoredFiles).toHaveBeenCalledWith([
         'uploads/audio/ch2.mp3',
         'uploads/images/chapters/ch2.jpg',
         null,
         null,
         null,
      ]);
      expect(mockPrisma.audioBook.delete).toHaveBeenCalledWith({ where: { id: 'book-1' } });
   });

   it('throws when audiobook is not found', async () => {
      mockPrisma.audioBook.findUnique.mockResolvedValue(null);

      await expect(service.deleteAudiobookWithChapters('missing')).rejects.toThrow();
      expect(mockPrisma.audioBook.delete).not.toHaveBeenCalled();
   });
});
