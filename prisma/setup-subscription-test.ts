/**
 * Subscription Test Setup Script
 *
 * Sets up the scenario described in the implementation ticket:
 *   1. Mark the (single) existing audiobook private and gate it behind
 *      the Standard subscription tier (or higher).
 *   2. Create three subscription plans: Base (99), Standard (249), Premium (399)
 *      with tiers 1, 2, 3 respectively.
 *   3. Subscribe the admin user to the Base plan.
 *
 * After running this script:
 *   - The admin user (on the Base plan) cannot access the audiobook because
 *     their tier (1) is below the audiobook's required tier (2).
 *   - An upgrade to Standard or Premium would grant access.
 *
 * Usage:
 *   npx ts-node prisma/setup-subscription-test.ts
 *
 * Environment overrides (optional):
 *   ADMIN_USER_ID    - external userId of the admin user (defaults to seed user)
 *   ADMIN_USERNAME   - username to use when creating the admin profile if absent
 */
import {
   PrismaClient,
   Prisma,
   BillingInterval,
   SubscriptionStatus
} from '@prisma/client';

const prisma = new PrismaClient();

// Tier constants - keep in sync with the migration/seed values.
const TIER_BASE = 1;
const TIER_STANDARD = 2;
const TIER_PREMIUM = 3;

/** Add N months to a date and return a new Date. */
function addMonths(date: Date, months: number): Date {
   const result = new Date(date.getTime());
   result.setMonth(result.getMonth() + months);
   return result;
}

async function upsertPlan(name: string, price: number, tier: number, description: string) {
   const existing = await prisma.subscriptionPlan.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
   });

   if (existing) {
      return prisma.subscriptionPlan.update({
         where: { id: existing.id },
         data: {
            price: new Prisma.Decimal(price),
            tier,
            description,
            isActive: true,
            billingInterval: BillingInterval.MONTHLY
         }
      });
   }

   return prisma.subscriptionPlan.create({
      data: {
         name,
         description,
         price: new Prisma.Decimal(price),
         currency: 'INR',
         tier,
         billingInterval: BillingInterval.MONTHLY,
         isActive: true
      }
   });
}

async function ensureAdminUserProfile() {
   const externalUserId = process.env['ADMIN_USER_ID'] || 'admin-user-1';
   const username = process.env['ADMIN_USERNAME'] || 'adminuser';

   const profile = await prisma.userProfile.upsert({
      where: { userId: externalUserId },
      update: {},
      create: {
         userId: externalUserId,
         username,
         firstName: 'Admin',
         lastName: 'User'
      }
   });

   return profile;
}

async function subscribeAdminToPlan(userProfileId: string, planId: string, planBillingInterval: BillingInterval) {
   // Cancel any pre-existing active subscriptions for this user so the new
   // Base-plan subscription does not collide with the unique-active invariant.
   await prisma.userSubscription.updateMany({
      where: {
         userProfileId,
         status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE]
         }
      },
      data: {
         status: SubscriptionStatus.CANCELED,
         canceledAt: new Date(),
         autoRenew: false
      }
   });

   const startDate = new Date();
   const currentPeriodEnd =
      planBillingInterval === BillingInterval.LIFETIME
         ? new Date('9999-12-31T23:59:59.999Z')
         : addMonths(startDate, 1);

   return prisma.userSubscription.create({
      data: {
         userProfileId,
         planId,
         status: SubscriptionStatus.ACTIVE,
         startDate,
         currentPeriodStart: startDate,
         currentPeriodEnd,
         autoRenew: true
      },
      include: { plan: true }
   });
}

async function main() {
   console.log('Starting subscription test setup...');

   // Step 1: Make the (first) existing audiobook private and gate it to Standard.
   const audiobook = await prisma.audioBook.findFirst({ orderBy: { createdAt: 'asc' } });
   if (!audiobook) {
      throw new Error(
         'No audiobook found in the database. Please seed an audiobook before running this script.'
      );
   }

   const updatedAudiobook = await prisma.audioBook.update({
      where: { id: audiobook.id },
      data: {
         isPublic: false,
         minPlanTier: TIER_STANDARD
      }
   });
   console.log(
      `Audiobook "${updatedAudiobook.title}" (${updatedAudiobook.id}) marked private (minPlanTier=${TIER_STANDARD}).`
   );

   // Step 2: Create the three subscription plans (idempotent).
   const basePlan = await upsertPlan('Base', 99, TIER_BASE, 'Base subscription tier');
   const standardPlan = await upsertPlan('Standard', 249, TIER_STANDARD, 'Standard subscription tier');
   const premiumPlan = await upsertPlan('Premium', 399, TIER_PREMIUM, 'Premium subscription tier');
   console.log(
      `Plans ready: Base(${basePlan.id}, tier=${basePlan.tier}), Standard(${standardPlan.id}, tier=${standardPlan.tier}), Premium(${premiumPlan.id}, tier=${premiumPlan.tier}).`
   );

   // Step 3: Subscribe the admin user to the Base plan.
   const adminProfile = await ensureAdminUserProfile();
   const subscription = await subscribeAdminToPlan(adminProfile.id, basePlan.id, basePlan.billingInterval);
   console.log(
      `Admin user "${adminProfile.username}" (${adminProfile.id}) subscribed to "${subscription.plan.name}" (sub=${subscription.id}).`
   );

   console.log('\nSubscription test setup complete.');
   console.log('Expectation: a GET request for this audiobook by the admin user (as a non-global-admin caller)');
   console.log('should be rejected with 403 because Base (tier 1) < Standard (tier 2) required by the audiobook.');
}

main()
   .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
