/**
 * ListeningHistoryService Tests
 */
import { ListeningHistoryService } from '../../services/ListeningHistoryService';
import { ApiError } from '../../types/ApiError';

const mockPrisma = {
   userProfile: {
      findUnique: jest.fn(),
   },
   listeningHistory: {
      findMany: jest.fn(),
      count: jest.fn(),
   },
} as any;

jest.mock('../../services/FileUrlService', () => ({
   fileUrlService: {
      resolveNestedAudiobookMedia: jest.fn(async (audiobook: { coverImage?: string | null }) => ({
         coverImage: audiobook.coverImage,
         imageAssets: {},
      })),
   },
}));

describe('ListeningHistoryService', () => {
   let service: ListeningHistoryService;

   beforeEach(() => {
      service = new ListeningHistoryService(mockPrisma);
      jest.clearAllMocks();
   });

   describe('getListeningHistoryByUserProfileId', () => {
      it('returns paginated listening history with audiobook details', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'user1' });
         const now = new Date();
         mockPrisma.listeningHistory.findMany.mockResolvedValue([
            {
               id: 'lh1',
               userProfileId: 'user1',
               audiobookId: 'book1',
               currentPosition: 900,
               completed: false,
               lastListenedAt: now,
               createdAt: now,
               updatedAt: now,
               audiobook: {
                  id: 'book1',
                  title: 'Test Book',
                  author: 'Author',
                  narrator: null,
                  coverImage: 'cover.jpg',
                  duration: 3600,
               },
            },
         ]);
         mockPrisma.listeningHistory.count.mockResolvedValue(1);

         const result = await service.getListeningHistoryByUserProfileId('user1', {
            page: 1,
            limit: 10,
         });

         expect(result.listeningHistory).toHaveLength(1);
         expect(result.listeningHistory[0]?.currentPosition).toBe(900);
         expect(result.listeningHistory[0]?.audiobook.title).toBe('Test Book');
         expect(result.totalCount).toBe(1);
         expect(mockPrisma.listeningHistory.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
               where: { userProfileId: 'user1' },
            })
         );
      });

      it('throws when user profile not found', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue(null);

         await expect(
            service.getListeningHistoryByUserProfileId('user1', { page: 1, limit: 10 })
         ).rejects.toBeInstanceOf(ApiError);

         expect(mockPrisma.listeningHistory.findMany).not.toHaveBeenCalled();
      });

      it('filters by audiobookId and completed', async () => {
         mockPrisma.userProfile.findUnique.mockResolvedValue({ id: 'user1' });
         mockPrisma.listeningHistory.findMany.mockResolvedValue([]);
         mockPrisma.listeningHistory.count.mockResolvedValue(0);

         await service.getListeningHistoryByUserProfileId('user1', {
            audiobookId: 'book1',
            completed: true,
            page: 1,
            limit: 20,
         });

         expect(mockPrisma.listeningHistory.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
               where: {
                  userProfileId: 'user1',
                  audiobookId: 'book1',
                  completed: true,
               },
            })
         );
      });
   });
});
