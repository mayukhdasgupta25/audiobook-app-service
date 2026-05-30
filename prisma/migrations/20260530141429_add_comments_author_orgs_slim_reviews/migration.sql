/*
  Warnings:

  - You are about to drop the column `content` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `reviews` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "content",
DROP COLUMN "title";

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "audiobookId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_organizations" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "author_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comments_audiobookId_idx" ON "comments"("audiobookId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "author_organizations_authorId_organizationId_key" ON "author_organizations"("authorId", "organizationId");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_audiobookId_fkey" FOREIGN KEY ("audiobookId") REFERENCES "audiobooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_organizations" ADD CONSTRAINT "author_organizations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_organizations" ADD CONSTRAINT "author_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
