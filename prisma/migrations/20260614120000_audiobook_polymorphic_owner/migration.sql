-- Replace organizationId/authorId with polymorphic ownerType + ownerId
CREATE TYPE "AudioBookOwnerType" AS ENUM ('AUTHOR', 'ORGANIZATION');

ALTER TABLE "audiobooks" ADD COLUMN "ownerType" "AudioBookOwnerType";
ALTER TABLE "audiobooks" ADD COLUMN "ownerId" TEXT;

-- Empty database — set placeholder before NOT NULL (no rows expected)
UPDATE "audiobooks" SET "ownerType" = 'AUTHOR', "ownerId" = 'migration-placeholder' WHERE "ownerType" IS NULL;

ALTER TABLE "audiobooks" ALTER COLUMN "ownerType" SET NOT NULL;
ALTER TABLE "audiobooks" ALTER COLUMN "ownerId" SET NOT NULL;

DROP INDEX IF EXISTS "audiobooks_organizationId_idx";
DROP INDEX IF EXISTS "audiobooks_authorId_idx";

ALTER TABLE "audiobooks" DROP COLUMN IF EXISTS "organizationId";
ALTER TABLE "audiobooks" DROP COLUMN IF EXISTS "authorId";

CREATE INDEX "audiobooks_ownerType_ownerId_idx" ON "audiobooks"("ownerType", "ownerId");
