/**
 * AudioBookController subscription-gating integration test.
 *
 * Exercises the end-to-end controller flow that gates audiobook fetching by
 * subscription tier. Verifies the scenario from the user story:
 *
 *   - Admin user subscribed to Base (tierLevel 1).
 *   - Audiobook marked private with minSubscriptionTier=2 (Standard).
 *   - The controller must reject `GET /api/v1/audiobooks/:id` with a forbidden
 *     ApiError mentioning subscription_tier_too_low.
 *
 * PrismaClient and the service are mocked so the test runs without any
 * external dependencies (consistent with the existing controller tests).
 */
import { AudioBookController } from '../../controllers/AudioBookController';
import { AudioBookService } from '../../services/AudioBookService';

import { ApiError } from '../../types/ApiError';
import { HttpStatusCode, ErrorType } from '../../types/common';

jest.mock('../../services/AudioBookService');
// UploadMiddleware transitively imports the 'image-size' module, which is
// not installed in this environment. Mock it the same way the existing
// controller tests do so test discovery does not fail on the missing dep.
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

   it('blocks an admin on the Base plan from viewing a Standard-gated audiobook', async () => {
      // Audiobook is private and gated at tier 2 (Standard).
      mockAudioBookService.getAudioBookById.mockResolvedValue({
         id: audiobookId,
         title: 'Gated Book',
         organizationId: orgId,
         minSubscriptionTier: 2,
         isPublic: false
      } as any);

      // Service raises a 403 ApiError because the admin's Base subscription
      // (tier 1) is below the audiobook's required tier (2).
      const forbiddenError = new ApiError(
         'forbidden.subscription_tier_too_low',
         HttpStatusCode.FORBIDDEN,
         ErrorType.FORBIDDEN
      );
      mockAudioBookService.assertUserCanAccessBySubscription = jest
         .fn()
         .mockRejectedValue(forbiddenError) as any;

      let caught: unknown = null;
      try {
         await controller.getAudioBookById(mockReq, mockRes, mockReq.next);
         await flushPromises();
      } catch (e) {
         caught = e;
      }

      // ErrorHandler.asyncHandler forwards thrown ApiErrors to next() rather
      // than re-throwing, so the controller call resolves while next() is
      // called with the ApiError. Accept either delivery channel.
      const nextErr = (mockReq.next as jest.Mock).mock.calls[0]?.[0];
      const delivered = (caught ?? nextErr) as ApiError | undefined;
      expect(delivered).toBeInstanceOf(ApiError);
      expect(delivered).toMatchObject({
         statusCode: HttpStatusCode.FORBIDDEN,
         message: 'forbidden.subscription_tier_too_low'
      });

      expect(mockAudioBookService.assertUserCanAccessBySubscription).toHaveBeenCalledWith(
         audiobookId,
         adminProfileId
      );
   });

   it('permits access when minSubscriptionTier is null (no gating)', async () => {
      mockAudioBookService.getAudioBookById.mockResolvedValue({
         id: audiobookId,
         title: 'Open Book',
         organizationId: orgId,
         minSubscriptionTier: null,
         isPublic: true
      } as any);
      mockAudioBookService.assertUserCanAccessBySubscription = jest.fn() as any;

      await controller.getAudioBookById(mockReq, mockRes, mockReq.next);
      await flushPromises();

      expect(mockAudioBookService.assertUserCanAccessBySubscription).not.toHaveBeenCalled();
   });

   it('permits access when the user is subscribed at or above the required tier', async () => {
      mockAudioBookService.getAudioBookById.mockResolvedValue({
         id: audiobookId,
         title: 'Gated Book',
         organizationId: orgId,
         minSubscriptionTier: 2,
         isPublic: false
      } as any);
      // Standard subscription clears the gate -- the service resolves cleanly.
      mockAudioBookService.assertUserCanAccessBySubscription = jest
         .fn()
         .mockResolvedValue(undefined) as any;

      await controller.getAudioBookById(mockReq, mockRes, mockReq.next);
      await flushPromises();

      expect(mockAudioBookService.assertUserCanAccessBySubscription).toHaveBeenCalledWith(
         audiobookId,
         adminProfileId
      );
   });
});
