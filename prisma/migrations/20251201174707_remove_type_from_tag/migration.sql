/*
  Warnings:

  - You are about to drop the column `type` on the `tags` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tags" DROP COLUMN "type";

-- DropEnum
DROP TYPE "public"."TagType";
