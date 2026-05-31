-- AlterTable
ALTER TABLE "moods" ADD COLUMN "icon" TEXT NOT NULL DEFAULT '';

-- Remove default so new rows must supply icon explicitly
ALTER TABLE "moods" ALTER COLUMN "icon" DROP DEFAULT;
