-- Add hierarchical tier level to subscription plans (default 0 = no tier).
ALTER TABLE "subscription_plans"
ADD COLUMN "tierLevel" INTEGER NOT NULL DEFAULT 0;

-- Add minimum subscription tier required to view an audiobook.
-- NULL means the audiobook is not subscription-gated.
ALTER TABLE "audiobooks"
ADD COLUMN "minSubscriptionTier" INTEGER;
