-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_idx" ON "organization_members"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_userProfileId_organizationId_key" ON "organization_members"("userProfileId", "organizationId");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add organizationId column to audiobooks
-- Step 1: Add column as nullable so existing rows can be migrated
ALTER TABLE "audiobooks" ADD COLUMN "organizationId" TEXT;

-- Step 2: Create a default organization and assign any existing audiobooks to it.
-- This guarantees the NOT NULL constraint below succeeds even if rows already exist.
DO $$
DECLARE
    audiobook_count INTEGER;
    default_org_id TEXT;
BEGIN
    SELECT COUNT(*) INTO audiobook_count FROM "audiobooks";
    IF audiobook_count > 0 THEN
        default_org_id := 'corgdefault0000000000000a';
        INSERT INTO "organizations" ("id", "name", "slug", "description", "createdAt", "updatedAt")
        VALUES (default_org_id, 'Default Organization', 'default', 'Auto-created organization for pre-existing audiobooks', NOW(), NOW())
        ON CONFLICT ("slug") DO NOTHING;

        UPDATE "audiobooks"
        SET "organizationId" = (SELECT "id" FROM "organizations" WHERE "slug" = 'default')
        WHERE "organizationId" IS NULL;
    END IF;
END $$;

-- Step 3: Enforce NOT NULL on organizationId
ALTER TABLE "audiobooks" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "audiobooks_organizationId_idx" ON "audiobooks"("organizationId");

-- AddForeignKey
ALTER TABLE "audiobooks" ADD CONSTRAINT "audiobooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
