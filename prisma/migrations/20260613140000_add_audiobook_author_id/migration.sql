-- Add authorId to audiobooks (auth-service author reference, no cross-DB FK)
ALTER TABLE "audiobooks" ADD COLUMN "authorId" TEXT;

CREATE INDEX "audiobooks_authorId_idx" ON "audiobooks"("authorId");
