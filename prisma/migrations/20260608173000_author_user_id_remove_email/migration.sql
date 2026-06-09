-- Remove legacy email-based author records before schema change
DELETE FROM "authors";

-- DropIndex
DROP INDEX IF EXISTS "authors_email_key";

-- AlterTable
ALTER TABLE "authors" DROP COLUMN "email",
ADD COLUMN "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "authors_userId_key" ON "authors"("userId");
