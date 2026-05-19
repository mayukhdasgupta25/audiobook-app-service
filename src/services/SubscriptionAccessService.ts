/**
 * Subscription Access Service
 * Determines whether a given user has the subscription tier required to access
 * subscription-gated audiobooks.
 *
 * Access rules:
 *   - Public audiobooks (isPublic = true) are always accessible.
 *   - Private audiobooks (isPublic = false) require an active subscription
 *     whose plan tier is >= the audiobook's minPlanTier. A null minPlanTier
 *     on a private audiobook means any active subscription is sufficient.
 *   - Statuses considered "active" for access: ACTIVE, TRIALING, PAST_DUE.
 */
import { PrismaClient, SubscriptionStatus } from '@prisma/client';

export interface AccessCheckAudioBook {
   isPublic: boolean;
   minPlanTier: number | null;
}

export interface AccessCheckResult {
   allowed: boolean;
   // When allowed=false, reason explains why for callers that want to log it.
   reason?: 'no_subscription' | 'insufficient_tier';
   // Tier of the user's active subscription plan, if any. null when no
   // active subscription exists.
   userTier: number | null;
}

export class SubscriptionAccessService {
   private prisma: PrismaClient;

   constructor(prisma: PrismaClient) {
      this.prisma = prisma;
   }

   /**
    * Fetch the tier of the user's currently active subscription, if any.
    * Returns null when the user has no active/trialing/past_due subscription.
    *
    * Picks the highest tier when multiple active subscriptions exist (defensive
    * since the create flow disallows overlapping active subs, but historical
    * data may contain duplicates).
    */
   async getActivePlanTier(userProfileId: string): Promise<number | null> {
      const subs = await this.prisma.userSubscription.findMany({
         where: {
            userProfileId,
            status: {
               in: [
                  SubscriptionStatus.ACTIVE,
                  SubscriptionStatus.TRIALING,
                  SubscriptionStatus.PAST_DUE
               ]
            }
         },
         select: { plan: { select: { tier: true } } }
      });

      if (subs.length === 0) {
         return null;
      }

      return subs.reduce<number>((max, s) => Math.max(max, s.plan.tier), 0);
   }

   /**
    * Check whether a user can access a given audiobook based on subscription tier.
    * Public audiobooks short-circuit to allowed=true without any DB lookup.
    */
   async checkAudiobookAccess(
      userProfileId: string,
      audiobook: AccessCheckAudioBook
   ): Promise<AccessCheckResult> {
      if (audiobook.isPublic) {
         return { allowed: true, userTier: null };
      }

      const userTier = await this.getActivePlanTier(userProfileId);
      if (userTier === null) {
         return { allowed: false, reason: 'no_subscription', userTier: null };
      }

      const required = audiobook.minPlanTier ?? 0;
      if (userTier < required) {
         return { allowed: false, reason: 'insufficient_tier', userTier };
      }

      return { allowed: true, userTier };
   }
}
