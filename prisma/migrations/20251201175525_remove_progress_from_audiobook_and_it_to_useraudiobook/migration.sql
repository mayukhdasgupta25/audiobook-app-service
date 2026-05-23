/*
  Warnings:

  - You are about to drop the column `overallProgress` on the `audiobooks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "audiobooks" DROP COLUMN "overallProgress";

-- AlterTable
ALTER TABLE "user_audiobooks" ADD COLUMN     "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
