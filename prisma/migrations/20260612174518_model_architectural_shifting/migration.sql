/*
  Warnings:

  - You are about to drop the `author_organizations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `authors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organizations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "audiobooks" DROP CONSTRAINT "audiobooks_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "author_organizations" DROP CONSTRAINT "author_organizations_authorId_fkey";

-- DropForeignKey
ALTER TABLE "author_organizations" DROP CONSTRAINT "author_organizations_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_userProfileId_fkey";

-- DropTable
DROP TABLE "author_organizations";

-- DropTable
DROP TABLE "authors";

-- DropTable
DROP TABLE "organization_members";

-- DropTable
DROP TABLE "organizations";

-- DropEnum
DROP TYPE "OrganizationRole";

-- DropEnum
DROP TYPE "OrganizationTeamSize";

-- CreateTable
CREATE TABLE "author_profiles" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "author_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "author_profiles_authorId_key" ON "author_profiles"("authorId");
