-- CreateEnum
CREATE TYPE "OrganizationTeamSize" AS ENUM ('1-10', '11-50', '51-200', '200+');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "preferredGenreId" TEXT,
ADD COLUMN "websiteUrl" TEXT,
ADD COLUMN "teamSize" "OrganizationTeamSize";

-- CreateIndex
CREATE INDEX "organizations_preferredGenreId_idx" ON "organizations"("preferredGenreId");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_preferredGenreId_fkey" FOREIGN KEY ("preferredGenreId") REFERENCES "genres"("id") ON DELETE SET NULL ON UPDATE CASCADE;
