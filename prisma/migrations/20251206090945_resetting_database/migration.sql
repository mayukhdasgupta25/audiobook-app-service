/*
  Warnings:

  - You are about to drop the column `genreId` on the `audiobooks` table. All the data in the column will be lost.
  - Made the column `coverImage` on table `chapters` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."audiobooks" DROP CONSTRAINT "audiobooks_genreId_fkey";

-- AlterTable
ALTER TABLE "audiobooks" DROP COLUMN "genreId";

-- AlterTable
ALTER TABLE "chapters" ALTER COLUMN "coverImage" SET NOT NULL;

-- CreateTable
CREATE TABLE "audiobook_genres" (
    "id" TEXT NOT NULL,
    "audiobookId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audiobook_genres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audiobook_genres_audiobookId_genreId_key" ON "audiobook_genres"("audiobookId", "genreId");

-- AddForeignKey
ALTER TABLE "audiobook_genres" ADD CONSTRAINT "audiobook_genres_audiobookId_fkey" FOREIGN KEY ("audiobookId") REFERENCES "audiobooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiobook_genres" ADD CONSTRAINT "audiobook_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
