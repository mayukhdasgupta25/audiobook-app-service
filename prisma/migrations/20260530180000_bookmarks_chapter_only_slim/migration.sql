-- Delete orphan bookmarks before making chapterId required
DELETE FROM "bookmarks" WHERE "chapterId" IS NULL;

-- DropForeignKey
ALTER TABLE "bookmarks" DROP CONSTRAINT IF EXISTS "bookmarks_audiobookId_fkey";

-- AlterTable
ALTER TABLE "bookmarks" DROP COLUMN IF EXISTS "audiobookId",
DROP COLUMN IF EXISTS "title",
DROP COLUMN IF EXISTS "description",
DROP COLUMN IF EXISTS "position",
DROP COLUMN IF EXISTS "timestamp",
ALTER COLUMN "chapterId" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookmarks_chapterId_idx" ON "bookmarks"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bookmarks_userProfileId_chapterId_key" ON "bookmarks"("userProfileId", "chapterId");
