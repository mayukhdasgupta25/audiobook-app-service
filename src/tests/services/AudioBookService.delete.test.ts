import { PrismaClient } from '@prisma/client';
import { AudioBookService } from '../../services/AudioBookService';
import { AudiobookMediaCleanupService } from '../../services/AudiobookMediaCleanupService';

jest.mock('../../services/AudiobookMediaCleanupService');

describe('AudioBookService.deleteAudioBook', () => {
   let service: AudioBookService;
   let mockDeleteAudiobookWithChapters: jest.Mock;

   beforeEach(() => {
      jest.clearAllMocks();
      mockDeleteAudiobookWithChapters = jest.fn().mockResolvedValue(undefined);
      (AudiobookMediaCleanupService as jest.Mock).mockImplementation(() => ({
         deleteAudiobookWithChapters: mockDeleteAudiobookWithChapters,
      }));

      service = new AudioBookService({} as PrismaClient);
   });

   it('delegates to AudiobookMediaCleanupService.deleteAudiobookWithChapters', async () => {
      await service.deleteAudioBook('book-123');

      expect(mockDeleteAudiobookWithChapters).toHaveBeenCalledWith('book-123');
   });
});
