/*
  Warnings:

  - Made the column `genreId` on table `audiobooks` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."audiobooks" DROP CONSTRAINT "audiobooks_genreId_fkey";

-- AlterTable
ALTER TABLE "audiobooks" ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ALTER COLUMN "duration" DROP NOT NULL,
ALTER COLUMN "fileSize" DROP NOT NULL,
ALTER COLUMN "genreId" SET NOT NULL,
ALTER COLUMN "language" SET DEFAULT 'bn';

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "audiobooks" ADD CONSTRAINT "audiobooks_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
