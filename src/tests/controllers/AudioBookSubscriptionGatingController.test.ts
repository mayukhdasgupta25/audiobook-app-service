/**
 * AudioBookController subscription-gating integration test.
 *
 * Verifies GET /api/v1/audiobooks/:id always returns 200 with audiobook details
 * and a `subscriptionAccess` payload the client can use to gate playback UI.
 */
import { AudioBookController } from '../../controllers/AudioBookController';
import { AudioBookService } from '../../services/AudioBookService';
import { ResponseHandler } from '../../utils/ResponseHandler';

jest.mock('../../services/AudioBookService');
jest.mock('../../middleware/UploadMiddleware', () => ({
   getFileUrl: jest.fn((path: string) => 'https://example.com' + path)
}));
jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
      getSuccessMessage: (key: string) => key
   }
}));
jest.mock('../../utils/ResponseHandler', () => ({
   ResponseHandler: {
      success: jest.fn(),
      forbidden: jest.fn(),
      paginated: jest.fn(),
      noContent: jest.fn(),
      validationError: jest.fn(),
      calculatePagination: jest.fn().mockReturnValue({})
   }
}));

const flushPromises = (): Promise<void> =>
   new Promise<void>((resolve) => setImmediate(resolve));

describe('AudioBookController subscription gating', () => {
   const adminProfileId = 'profile-admin-1';
   const audiobookId = 'audiobook-1';
   const orgId = 'org-1';

   let mockPrisma: any;
   let mockReq: any;
   let mockRes: any;
   let mockAudioBookService: jest.Mocked<AudioBookService>;
   let controller: AudioBookController;

   beforeEach(() => {
      jest.clearAllMocks();

      mockPrisma = {
         userProfile: {
            findUnique: jest.fn().mockResolvedValue({ id: adminProfileId })
         }
      };

      mockRes = {
         status: jest.fn().mockReturnThis(),
         json: jest.fn().mockReturnThis()
      };
      mockReq = {
         params: { id: audiobookId },
         query: {},
         body: {},
         user: { id: 'auth-admin', role: 'ADMIN' }
      };
      mockReq.next = jest.fn();

      controller = new AudioBookController(mockPrisma);
      mockAudioBookService = (controller as any).audioBookService;
   });

   it('returns audiobook details with denied subscriptionAccess when tier is too low', async () => {
      const mockBook = {
         id: audiobookId,
         title: 'Gated Book',
         organizationId: orgId,
         minSubscriptionTier: 2,
         isPublic: false
      };

      mockAudioBookService.getAudioBookById.mockResolvedValue(mockBook as any);
      mockAudioBookService.getSubscriptionAccessForAudiobook = jest
         .fn()
         .mockResolvedValue({
            canAccess: false,
            message: 'forbidden.subscription_tier_too_low',
            requiredTier: 2,
            userTier: 1
         }) as any;

      await controller.getAudioBookById(mockReq, mockRes, mockReq.next);
      await flushPromises();

      expect(mockAudioBookService.getSubscriptionAccessForAudiobook).toHaveBeenCalledWith(
         audiobookId,
         2,
         adminProfileId
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(
         mockRes,
         {
            ...mockBook,
            subscriptionAccess: {
               canAccess: false,
               message: 'forbidden.subscription_tier_too_low',
               requiredTier: 2,
               userTier: 1
            }
         },
         'audiobooks.retrieved_by_id'
      );
      expect(mockReq.next).not.toHaveBeenCalled();
   });

   it('returns audiobook details with granted subscriptionAccess when tier is sufficient', async () => {
      const mockBook = {
         id: audiobookId,
         title: 'Gated Book',
         organizationId: orgId,
         minSubscriptionTier: 2,
         isPublic: false
      };

      mockAudioBookService.getAudioBookById.mockResolvedValue(mockBook as any);
      mockAudioBookService.getSubscriptionAccessForAudiobook = jest
         .fn()
         .mockResolvedValue({
            canAccess: true,
            requiredTier: 2,
            userTier: 2
         }) as any;

      await controller.getAudioBookById(mockReq, mockRes, mockReq.next);
      await flushPromises();

      expect(ResponseHandler.success).toHaveBeenCalledWith(
         mockRes,
         expect.objectContaining({
            subscriptionAccess: { canAccess: true, requiredTier: 2, userTier: 2 }
         }),
         'audiobooks.retrieved_by_id'
      );
   });

   it('includes subscriptionAccess for ungated audiobooks', async () => {
      const mockBook = {
         id: audiobookId,
         title: 'Open Book',
         organizationId: orgId,
         minSubscriptionTier: null,
         isPublic: true
      };

      mockAudioBookService.getAudioBookById.mockResolvedValue(mockBook as any);
      mockAudioBookService.getSubscriptionAccessForAudiobook = jest
         .fn()
         .mockResolvedValue({ canAccess: true }) as any;

      await controller.getAudioBookById(mockReq, mockRes, mockReq.next);
      await flushPromises();

      expect(mockAudioBookService.getSubscriptionAccessForAudiobook).toHaveBeenCalledWith(
         audiobookId,
         null,
         adminProfileId
      );
      expect(ResponseHandler.success).toHaveBeenCalled();
   });
});
