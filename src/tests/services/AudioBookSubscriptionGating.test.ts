/**
 * AudioBookService subscription-gating tests.
 *
 * These tests directly exercise the production tier-gating logic that powers
 * the audiobook + subscription scenario:
 *   - 3 plans (Base/Standard/Premium) at tier levels 1/2/3.
 *   - A private audiobook gated at the Standard tier (level 2).
 *   - An admin user subscribed to Base (tier 1) cannot play the audiobook.
 *   - Upgrading the same user to Standard (or Premium) unlocks access.
 *
 * The tests mock PrismaClient so they are independent of any running database.
 */
import { AudioBookService } from '../../services/AudioBookService';
import { HttpStatusCode } from '../../types/common';

jest.mock('../../utils/MessageHandler', () => ({
   MessageHandler: {
      getErrorMessage: (key: string) => key,
      getSuccessMessage: (key: string) => key
   }
}));

interface MockSubscription {
   status: 'ACTIVE' | 'TRIALING' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';
   plan: { tierLevel: number };
}

function buildMockPrisma(opts: {
   audiobook?: { id: string; minSubscriptionTier: number | null } | null;
   subscriptions?: MockSubscription[];
}) {
   return {
      audioBook: {
         findUnique: jest.fn().mockResolvedValue(opts.audiobook ?? null)
      },
      userSubscription: {
         findMany: jest.fn().mockResolvedValue(opts.subscriptions ?? [])
      }
   } as any;
}

describe('AudioBookService subscription gating', () => {
   const audiobookId = 'audiobook-1';
   const userProfileId = 'user-profile-1';

   describe('getSubscriptionAccessForAudiobook', () => {
      it('grants access when the audiobook has no minSubscriptionTier', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: null }
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.getSubscriptionAccessForAudiobook(audiobookId, null, userProfileId)
         ).resolves.toEqual({ canAccess: true });

         expect(prisma.userSubscription.findMany).not.toHaveBeenCalled();
      });

      it('returns subscription_required when the user has no profile', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 }
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.getSubscriptionAccessForAudiobook(audiobookId, 2, null)
         ).resolves.toEqual({
            canAccess: false,
            message: 'forbidden.subscription_required',
            requiredTier: 2,
            userTier: null
         });
         expect(prisma.userSubscription.findMany).not.toHaveBeenCalled();
      });

      it('returns subscription_required when the user has no active subscription', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: []
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.getSubscriptionAccessForAudiobook(audiobookId, 2, userProfileId)
         ).resolves.toEqual({
            canAccess: false,
            message: 'forbidden.subscription_required',
            requiredTier: 2,
            userTier: null
         });
      });

      it('returns tier_too_low when the user is subscribed below the required tier', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: [{ status: 'ACTIVE', plan: { tierLevel: 1 } }]
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.getSubscriptionAccessForAudiobook(audiobookId, 2, userProfileId)
         ).resolves.toEqual({
            canAccess: false,
            message: 'forbidden.subscription_tier_too_low',
            requiredTier: 2,
            userTier: 1
         });
      });

      it('grants access when the user is subscribed at the exact required tier', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: [{ status: 'ACTIVE', plan: { tierLevel: 2 } }]
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.getSubscriptionAccessForAudiobook(audiobookId, 2, userProfileId)
         ).resolves.toEqual({
            canAccess: true,
            requiredTier: 2,
            userTier: 2
         });
      });

      it('grants access when the user is subscribed above the required tier', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: [{ status: 'ACTIVE', plan: { tierLevel: 3 } }]
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.getSubscriptionAccessForAudiobook(audiobookId, 2, userProfileId)
         ).resolves.toEqual({
            canAccess: true,
            requiredTier: 2,
            userTier: 3
         });
      });

      it('uses the highest tier across multiple active subscriptions', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: [
               { status: 'ACTIVE', plan: { tierLevel: 1 } },
               { status: 'TRIALING', plan: { tierLevel: 3 } }
            ]
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.getSubscriptionAccessForAudiobook(audiobookId, 2, userProfileId)
         ).resolves.toEqual({
            canAccess: true,
            requiredTier: 2,
            userTier: 3
         });
      });

      it('denies access when only canceled subscriptions exist', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: []
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.getSubscriptionAccessForAudiobook(audiobookId, 2, userProfileId)
         ).resolves.toMatchObject({
            canAccess: false,
            message: 'forbidden.subscription_required'
         });
      });
   });

   describe('assertUserCanAccessBySubscription (legacy enforcement)', () => {
      it('throws NOT_FOUND when the audiobook does not exist', async () => {
         const prisma = buildMockPrisma({ audiobook: null });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).rejects.toMatchObject({
            statusCode: HttpStatusCode.NOT_FOUND
         });
      });

      it('throws FORBIDDEN when access is denied', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: [{ status: 'ACTIVE', plan: { tierLevel: 1 } }]
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).rejects.toMatchObject({
            statusCode: HttpStatusCode.FORBIDDEN,
            message: 'forbidden.subscription_tier_too_low'
         });
      });
   });

   describe('getUserHighestActiveTier', () => {
      it('returns null when the user has no active subscriptions', async () => {
         const prisma = buildMockPrisma({ subscriptions: [] });
         const service = new AudioBookService(prisma);

         await expect(service.getUserHighestActiveTier(userProfileId)).resolves.toBeNull();
      });

      it('returns the highest tier among active/trialing subscriptions', async () => {
         const prisma = buildMockPrisma({
            subscriptions: [
               { status: 'ACTIVE', plan: { tierLevel: 1 } },
               { status: 'ACTIVE', plan: { tierLevel: 2 } },
               { status: 'TRIALING', plan: { tierLevel: 3 } }
            ]
         });
         const service = new AudioBookService(prisma);

         await expect(service.getUserHighestActiveTier(userProfileId)).resolves.toBe(3);
      });
   });
});
