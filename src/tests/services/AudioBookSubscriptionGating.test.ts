import { AudioBookService } from '../../services/AudioBookService';
import { SubscriptionClient } from '../../clients/SubscriptionClient';
import { HttpStatusCode } from '../../types/common';

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
      getSuccessMessage: (key: string) => key,
   },
}));

function buildMockPrisma(opts: {
   audiobook?: { id: string; minSubscriptionTier: number | null } | null;
}) {
   return {
      audioBook: {
         findUnique: jest.fn().mockResolvedValue(opts.audiobook ?? null),
      },
   } as any;
}

function buildMockSubscriptionClient(tier: number | null): SubscriptionClient {
   return {
      getUserHighestActiveTier: jest.fn().mockResolvedValue(tier),
   } as unknown as SubscriptionClient;
}

describe('AudioBookService subscription gating', () => {
   const audiobookId = 'audiobook-1';
   const userId = 'auth-user-uuid';
   const accessToken = 'test-token';

   it('grants access when no minSubscriptionTier', async () => {
      const subClient = buildMockSubscriptionClient(null);
      const service = new AudioBookService(buildMockPrisma({}), undefined, subClient);
      await expect(
         service.getSubscriptionAccessForAudiobook(audiobookId, null, userId, accessToken)
      ).resolves.toEqual({ canAccess: true });
      expect(subClient.getUserHighestActiveTier).not.toHaveBeenCalled();
   });

   it('returns subscription_required without user or token', async () => {
      const service = new AudioBookService(buildMockPrisma({}), undefined, buildMockSubscriptionClient(null));
      await expect(
         service.getSubscriptionAccessForAudiobook(audiobookId, 2, null, null)
      ).resolves.toMatchObject({
         canAccess: false,
         message: 'forbidden.subscription_required',
      });
   });

   it('returns tier_too_low when tier is below required', async () => {
      const service = new AudioBookService(buildMockPrisma({}), undefined, buildMockSubscriptionClient(1));
      await expect(
         service.getSubscriptionAccessForAudiobook(audiobookId, 2, userId, accessToken)
      ).resolves.toMatchObject({
         canAccess: false,
         message: 'forbidden.subscription_tier_too_low',
         userTier: 1,
      });
   });

   it('grants access when tier qualifies', async () => {
      const service = new AudioBookService(buildMockPrisma({}), undefined, buildMockSubscriptionClient(2));
      await expect(
         service.getSubscriptionAccessForAudiobook(audiobookId, 2, userId, accessToken)
      ).resolves.toMatchObject({ canAccess: true, userTier: 2 });
   });

   it('delegates getUserHighestActiveTier to SubscriptionClient', async () => {
      const subClient = buildMockSubscriptionClient(3);
      const service = new AudioBookService(buildMockPrisma({}), undefined, subClient);
      await expect(service.getUserHighestActiveTier(userId, accessToken)).resolves.toBe(3);
      expect(subClient.getUserHighestActiveTier).toHaveBeenCalledWith(userId, accessToken);
   });

   it('assertUserCanAccessBySubscription throws FORBIDDEN when denied', async () => {
      const prisma = buildMockPrisma({
         audiobook: { id: audiobookId, minSubscriptionTier: 2 },
      });
      const service = new AudioBookService(prisma, undefined, buildMockSubscriptionClient(1));
      await expect(
         service.assertUserCanAccessBySubscription(audiobookId, userId, accessToken)
      ).rejects.toMatchObject({
         statusCode: HttpStatusCode.FORBIDDEN,
      });
   });
});
