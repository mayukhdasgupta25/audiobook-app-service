-- Add tier column to subscription_plans for ranking plans (Base=1, Standard=2, Premium=3, etc.)
ALTER TABLE "subscription_plans" ADD COLUMN "tier" INTEGER NOT NULL DEFAULT 0;

-- Add minPlanTier column to audiobooks for subscription-tier gating of private audiobooks.
-- A null value means no subscription tier is required.
ALTER TABLE "audiobooks" ADD COLUMN "minPlanTier" INTEGER;

-- Helpful index for ordering plans by tier
CREATE INDEX "subscription_plans_tier_idx" ON "subscription_plans"("tier");
