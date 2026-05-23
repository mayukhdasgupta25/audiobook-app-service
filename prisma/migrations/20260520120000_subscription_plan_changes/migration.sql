-- CreateEnum
CREATE TYPE "PlanChangeType" AS ENUM ('UPGRADE', 'DOWNGRADE');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('PRORATION_CHARGE', 'RENEWAL_CHARGE', 'RENEWAL_FAILED', 'RENEWAL_RETRY_FAILED', 'PLAN_CHANGE_SCHEDULED');

-- AlterTable
ALTER TABLE "user_subscriptions" ADD COLUMN "pendingPlanId" TEXT,
ADD COLUMN "pendingPlanChangeAt" TIMESTAMP(3),
ADD COLUMN "pendingPlanChangeType" "PlanChangeType",
ADD COLUMN "pastDueRetryCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "subscription_billing_events" (
    "id" TEXT NOT NULL,
    "userSubscriptionId" TEXT NOT NULL,
    "type" "BillingEventType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_subscriptions_pendingPlanId_idx" ON "user_subscriptions"("pendingPlanId");

-- CreateIndex
CREATE INDEX "subscription_billing_events_userSubscriptionId_idx" ON "subscription_billing_events"("userSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_billing_events_type_idx" ON "subscription_billing_events"("type");

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_billing_events" ADD CONSTRAINT "subscription_billing_events_userSubscriptionId_fkey" FOREIGN KEY ("userSubscriptionId") REFERENCES "user_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
