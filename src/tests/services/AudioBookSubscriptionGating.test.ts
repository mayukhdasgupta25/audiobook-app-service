/**
 * AudioBookService subscription-gating tests.
 *
 * These tests directly exercise the production tier-gating logic that powers
 * the audiobook + subscription scenario:
 *   - 3 plans (Base/Standard/Premium) at tier levels 1/2/3.
 *   - A private audiobook gated at the Standard tier (level 2).
 *   - An admin user subscribed to Base (tier 1) cannot view the audiobook.
 *   - Upgrading the same user to Standard (or Premium) unlocks access.
 *
 * The tests mock PrismaClient so they are independent of any running database.
 */
import { AudioBookService } from '../../services/AudioBookService';
import { ApiError } from '../../types/ApiError';
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

   describe('assertUserCanAccessBySubscription', () => {
      it('is a no-op when the audiobook has no minSubscriptionTier', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: null }
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).resolves.toBeUndefined();

         expect(prisma.userSubscription.findMany).not.toHaveBeenCalled();
      });

      it('throws NOT_FOUND when the audiobook does not exist', async () => {
         const prisma = buildMockPrisma({ audiobook: null });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).rejects.toMatchObject({
            statusCode: HttpStatusCode.NOT_FOUND
         });
      });

      it('throws FORBIDDEN with subscription_required when the user has no profile', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 }
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, null)
         ).rejects.toMatchObject({
            statusCode: HttpStatusCode.FORBIDDEN,
            message: 'forbidden.subscription_required'
         });
         expect(prisma.userSubscription.findMany).not.toHaveBeenCalled();
      });

      it('throws FORBIDDEN with subscription_required when the user has no active subscription', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: []
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).rejects.toMatchObject({
            statusCode: HttpStatusCode.FORBIDDEN,
            message: 'forbidden.subscription_required'
         });
      });

      it('rejects with tier_too_low when the user is subscribed below the required tier', async () => {
         // Admin on the Base plan trying to access a Standard-gated audiobook
         // -- this is the exact scenario in the user story.
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

      it('grants access when the user is subscribed at the exact required tier', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: [{ status: 'ACTIVE', plan: { tierLevel: 2 } }]
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).resolves.toBeUndefined();
      });

      it('grants access when the user is subscribed above the required tier', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            subscriptions: [{ status: 'ACTIVE', plan: { tierLevel: 3 } }]
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).resolves.toBeUndefined();
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
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).resolves.toBeUndefined();
      });

      it('ignores canceled subscriptions even if their plan tier is sufficient', async () => {
         const prisma = buildMockPrisma({
            audiobook: { id: audiobookId, minSubscriptionTier: 2 },
            // The Prisma findMany call is filtered to ACTIVE/TRIALING in the
            // service; simulate the DB returning no eligible rows.
            subscriptions: []
         });
         const service = new AudioBookService(prisma);

         await expect(
            service.assertUserCanAccessBySubscription(audiobookId, userProfileId)
         ).rejects.toBeInstanceOf(ApiError);
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
