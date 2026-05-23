/**
 * Subscription Setup Script
 *
 * Idempotent script that prepares the database for the subscription-gating
 * scenario:
 *
 *   1. Marks the single audiobook in the DB as private (`isPublic = false`)
 *      and gates it behind the Standard subscription tier (tier level 2).
 *      If multiple audiobooks exist the most recently created one is used;
 *      if none exists the script aborts with a clear error.
 *   2. Creates three subscription plans (or updates them if they already exist):
 *        - Base     (tierLevel 1, price 99)
 *        - Standard (tierLevel 2, price 249)
 *        - Premium  (tierLevel 3, price 399)
 *   3. Ensures an "admin" user profile exists and subscribes that user to the
 *      Base plan. Any prior active subscription is canceled first so that
 *      re-running the script is safe.
 *
 * Step 5 of the scenario (verifying the admin cannot access the audiobook with
 * a Base subscription) is exercised by the automated tests in
 * `src/tests/services/AudioBookSubscriptionGating.test.ts`; this script
 * additionally prints a final access check using the production service code.
 */
import {
   BillingInterval,
   Prisma,
   PrismaClient,
   SubscriptionStatus
} from '@prisma/client';
import { AudioBookService } from '../src/services/AudioBookService';

const prisma = new PrismaClient();

const PLANS = [
   { name: 'Base', tierLevel: 1, price: 99 },
   { name: 'Standard', tierLevel: 2, price: 249 },
   { name: 'Premium', tierLevel: 3, price: 399 }
] as const;

const ADMIN_EXTERNAL_USER_ID = process.env['ADMIN_USER_ID'] ?? 'admin-user';
const ADMIN_USERNAME = process.env['ADMIN_USERNAME'] ?? 'admin';
const SUBSCRIPTION_CURRENCY = process.env['SUBSCRIPTION_CURRENCY'] ?? 'INR';
// The audiobook is unlocked from the Standard plan upwards. Tier 2 == Standard.
const REQUIRED_TIER_FOR_AUDIOBOOK = 2;

async function ensureAudiobookGated(): Promise<{ id: string; title: string }> {
   const audiobookCount = await prisma.audioBook.count();
   if (audiobookCount === 0) {
      throw new Error(
         'No audiobook exists in the database. Seed an audiobook first, then re-run this script.'
      );
   }

   // Prefer the most recently created audiobook when multiple are present;
   // this matches the script's intent of operating on "the audiobook" in the
   // DB while remaining safe for environments that have accidentally added
   // extras during development.
   const audiobook = await prisma.audioBook.findFirst({
      orderBy: { createdAt: 'desc' }
   });
   if (!audiobook) {
      throw new Error('Failed to load an audiobook record.');
   }

   await prisma.audioBook.update({
      where: { id: audiobook.id },
      data: {
         isPublic: false,
         minSubscriptionTier: REQUIRED_TIER_FOR_AUDIOBOOK
      }
   });

   console.log(
      `✅ Audiobook "${audiobook.title}" (${audiobook.id}) is now private and gated at tier ${REQUIRED_TIER_FOR_AUDIOBOOK} (Standard).`
   );
   return { id: audiobook.id, title: audiobook.title };
}

async function ensurePlans(): Promise<Map<string, { id: string; tierLevel: number }>> {
   const planByName = new Map<string, { id: string; tierLevel: number }>();

   for (const plan of PLANS) {
      const existing = await prisma.subscriptionPlan.findFirst({
         where: { name: { equals: plan.name, mode: 'insensitive' } }
      });

      const data = {
         description: `${plan.name} subscription plan`,
         price: new Prisma.Decimal(plan.price),
         currency: SUBSCRIPTION_CURRENCY,
         tierLevel: plan.tierLevel,
         billingInterval: BillingInterval.MONTHLY,
         trialDays: 0,
         isActive: true
      };

      const created = existing
         ? await prisma.subscriptionPlan.update({
            where: { id: existing.id },
            data
         })
         : await prisma.subscriptionPlan.create({
            data: { name: plan.name, ...data }
         });

      planByName.set(plan.name, { id: created.id, tierLevel: plan.tierLevel });
      console.log(`✅ Plan: ${plan.name} (tier ${plan.tierLevel}, ${SUBSCRIPTION_CURRENCY} ${plan.price})`);
   }

   return planByName;
}

async function ensureAdminProfile(): Promise<{ id: string; userId: string }> {
   const profile = await prisma.userProfile.upsert({
      where: { userId: ADMIN_EXTERNAL_USER_ID },
      update: {},
      create: {
         userId: ADMIN_EXTERNAL_USER_ID,
         username: ADMIN_USERNAME,
         firstName: 'Admin',
         lastName: 'User'
      }
   });
   console.log(`✅ Admin profile: ${profile.username} (${profile.id})`);
   return { id: profile.id, userId: profile.userId };
}

async function subscribeAdminToBase(
   userProfileId: string,
   basePlan: { id: string; tierLevel: number }
): Promise<void> {
   // Cancel any existing active/trialing subscription so this run is idempotent
   // and the admin ends up on exactly one Base subscription.
   const existingActive = await prisma.userSubscription.findMany({
      where: {
         userProfileId,
         status: {
            in: [
               SubscriptionStatus.ACTIVE,
               SubscriptionStatus.TRIALING,
               SubscriptionStatus.PAST_DUE,
               SubscriptionStatus.PENDING
            ]
         }
      }
   });
   for (const sub of existingActive) {
      await prisma.userSubscription.update({
         where: { id: sub.id },
         data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
            cancelAtPeriodEnd: false,
            autoRenew: false,
            endDate: new Date()
         }
      });
   }

   const now = new Date();
   const oneMonthLater = new Date(now);
   oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

   const created = await prisma.userSubscription.create({
      data: {
         userProfileId,
         planId: basePlan.id,
         status: SubscriptionStatus.ACTIVE,
         startDate: now,
         currentPeriodStart: now,
         currentPeriodEnd: oneMonthLater,
         autoRenew: true
      }
   });
   console.log(`✅ Admin subscribed to Base plan (subscription ${created.id}).`);
}

async function verifyAccess(
   audiobookId: string,
   userProfileId: string,
   minSubscriptionTier: number
): Promise<void> {
   const service = new AudioBookService(prisma);
   const access = await service.getSubscriptionAccessForAudiobook(
      audiobookId,
      minSubscriptionTier,
      userProfileId
   );
   if (access.canAccess) {
      console.warn(
         '⚠️  Unexpected: admin with Base plan was granted access to the gated audiobook.'
      );
   } else {
      console.log(
         `✅ Verified: admin on Base plan cannot access the audiobook. Reason: ${access.message}`
      );
   }
}

async function main(): Promise<void> {
   console.log('🌱 Setting up subscription-gated audiobook scenario...');

   const audiobook = await ensureAudiobookGated();
   const plans = await ensurePlans();
   const basePlan = plans.get('Base');
   if (!basePlan) {
      throw new Error('Base plan not found after creation.');
   }

   const adminProfile = await ensureAdminProfile();
   await subscribeAdminToBase(adminProfile.id, basePlan);
   await verifyAccess(audiobook.id, adminProfile.id, REQUIRED_TIER_FOR_AUDIOBOOK);

   console.log('🎉 Subscription setup complete.');
}

main()
   .catch((error) => {
      console.error('❌ Subscription setup failed:', error);
      process.exitCode = 1;
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
