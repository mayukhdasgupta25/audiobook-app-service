/**
 * SubscriptionAccessService Tests
 *
 * Verifies the tier-based access control logic used to gate private
 * audiobooks behind subscription plans.
 */
import { SubscriptionAccessService } from '../../services/SubscriptionAccessService';

const mockPrisma = {
   userSubscription: {
      findMany: jest.fn()
   }
} as any;

describe('SubscriptionAccessService', () => {
   let service: SubscriptionAccessService;

   beforeEach(() => {
      service = new SubscriptionAccessService(mockPrisma);
      jest.clearAllMocks();
   });

   describe('getActivePlanTier', () => {
      it('returns null when user has no active subscriptions', async () => {
         mockPrisma.userSubscription.findMany.mockResolvedValue([]);
         const tier = await service.getActivePlanTier('user-1');
         expect(tier).toBeNull();
      });

      it("returns the tier of the user's active subscription", async () => {
         mockPrisma.userSubscription.findMany.mockResolvedValue([
            { plan: { tier: 1 } }
         ]);
         const tier = await service.getActivePlanTier('user-1');
         expect(tier).toBe(1);
      });

      it('returns the highest tier when multiple active subscriptions exist', async () => {
         mockPrisma.userSubscription.findMany.mockResolvedValue([
            { plan: { tier: 1 } },
            { plan: { tier: 3 } },
            { plan: { tier: 2 } }
         ]);
         const tier = await service.getActivePlanTier('user-1');
         expect(tier).toBe(3);
      });
   });

   describe('checkAudiobookAccess', () => {
      it('allows access to public audiobooks without checking subscription', async () => {
         const result = await service.checkAudiobookAccess('user-1', {
            isPublic: true,
            minPlanTier: 5
         });
         expect(result.allowed).toBe(true);
         expect(mockPrisma.userSubscription.findMany).not.toHaveBeenCalled();
      });

      it('denies access to private audiobooks when user has no subscription', async () => {
         mockPrisma.userSubscription.findMany.mockResolvedValue([]);
         const result = await service.checkAudiobookAccess('user-1', {
            isPublic: false,
            minPlanTier: 2
         });
         expect(result.allowed).toBe(false);
         expect(result.reason).toBe('no_subscription');
         expect(result.userTier).toBeNull();
      });

      // Core scenario from the implementation task: Base-plan user (tier 1)
      // requesting an audiobook gated to Standard (tier 2) is rejected.
      it('denies access when user tier is below required tier (Base vs Standard)', async () => {
         mockPrisma.userSubscription.findMany.mockResolvedValue([
            { plan: { tier: 1 } } // Base plan
         ]);
         const result = await service.checkAudiobookAccess('user-1', {
            isPublic: false,
            minPlanTier: 2 // Standard tier required
         });
         expect(result.allowed).toBe(false);
         expect(result.reason).toBe('insufficient_tier');
         expect(result.userTier).toBe(1);
      });

      it('allows access when user tier equals required tier', async () => {
         mockPrisma.userSubscription.findMany.mockResolvedValue([
            { plan: { tier: 2 } }
         ]);
         const result = await service.checkAudiobookAccess('user-1', {
            isPublic: false,
            minPlanTier: 2
         });
         expect(result.allowed).toBe(true);
         expect(result.userTier).toBe(2);
      });

      it('allows access when user tier exceeds required tier (Premium vs Standard)', async () => {
         mockPrisma.userSubscription.findMany.mockResolvedValue([
            { plan: { tier: 3 } } // Premium
         ]);
         const result = await service.checkAudiobookAccess('user-1', {
            isPublic: false,
            minPlanTier: 2
         });
         expect(result.allowed).toBe(true);
         expect(result.userTier).toBe(3);
      });

      it('treats null minPlanTier on a private audiobook as "any active subscription"', async () => {
         mockPrisma.userSubscription.findMany.mockResolvedValue([
            { plan: { tier: 1 } }
         ]);
         const result = await service.checkAudiobookAccess('user-1', {
            isPublic: false,
            minPlanTier: null
         });
         expect(result.allowed).toBe(true);
         expect(result.userTier).toBe(1);
      });
   });
});
