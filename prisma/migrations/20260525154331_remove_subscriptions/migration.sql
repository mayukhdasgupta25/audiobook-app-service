/*
  Warnings:

  - You are about to drop the `subscription_billing_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscription_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_subscriptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."subscription_billing_events" DROP CONSTRAINT "subscription_billing_events_userSubscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_subscriptions" DROP CONSTRAINT "user_subscriptions_pendingPlanId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_subscriptions" DROP CONSTRAINT "user_subscriptions_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_subscriptions" DROP CONSTRAINT "user_subscriptions_userProfileId_fkey";

-- DropTable
DROP TABLE "public"."subscription_billing_events";

-- DropTable
DROP TABLE "public"."subscription_plans";

-- DropTable
DROP TABLE "public"."user_subscriptions";

-- DropEnum
DROP TYPE "public"."BillingEventType";

-- DropEnum
DROP TYPE "public"."BillingInterval";

-- DropEnum
DROP TYPE "public"."PlanChangeType";

-- DropEnum
DROP TYPE "public"."SubscriptionStatus";
