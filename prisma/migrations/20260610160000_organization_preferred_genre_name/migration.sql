-- DropForeignKey
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_preferredGenreId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "organizations_preferredGenreId_idx";

-- AlterTable: replace preferredGenreId FK with preferredGenre name string
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "preferredGenreId";
ALTER TABLE "organizations" ADD COLUMN "preferredGenre" TEXT;
