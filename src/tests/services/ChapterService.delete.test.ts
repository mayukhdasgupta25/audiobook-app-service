/**
 * ChapterService delete cleanup tests
 */

import { ChapterService } from '../../services/ChapterService';
import { RabbitMQFactory } from '../../config/rabbitmq';
import { mediaCleanupService } from '../../services/MediaCleanupService';

jest.mock('../../config/rabbitmq');
jest.mock('../../services/MediaCleanupService', () => ({
   mediaCleanupService: {
      deleteStoredFiles: jest.fn().mockResolvedValue(undefined),
   },
}));

describe('ChapterService.deleteChapter', () => {
   const mockFindUnique = jest.fn();
   const mockDelete = jest.fn();
   const mockPublishChapterDeletion = jest.fn().mockResolvedValue(true);

   beforeEach(() => {
      jest.clearAllMocks();

      (RabbitMQFactory.getConnection as jest.Mock).mockReturnValue({
         publishChapterDeletion: mockPublishChapterDeletion,
      });
   });

   it('deletes stored media before removing the chapter record', async () => {
      mockFindUnique.mockResolvedValue({
         id: 'chapter-1',
         audiobookId: 'book-1',
         filePath: 'uploads/chapters/audio.mp3',
         coverImage: 'uploads/images/chapters/cover.jpg',
         chapterCardCoverImage: 'uploads/images/chapters/card.jpg',
         maximizedChapterCoverImage: 'uploads/images/chapters/max.jpg',
         minimizedChapterCoverImage: 'uploads/images/chapters/min.jpg',
      });
      mockDelete.mockResolvedValue(undefined);

      const prisma = {
         chapter: {
            findUnique: mockFindUnique,
            delete: mockDelete,
         },
      } as unknown as ConstructorParameters<typeof ChapterService>[0];

      const service = new ChapterService(prisma);
      await service.deleteChapter('chapter-1');

      expect(mediaCleanupService.deleteStoredFiles).toHaveBeenCalledWith([
         'uploads/chapters/audio.mp3',
         'uploads/images/chapters/cover.jpg',
         'uploads/images/chapters/card.jpg',
         'uploads/images/chapters/max.jpg',
         'uploads/images/chapters/min.jpg',
      ]);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'chapter-1' } });
      expect(mockPublishChapterDeletion).toHaveBeenCalledWith('chapter-1');
   });
});
