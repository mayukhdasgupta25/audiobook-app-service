-- CreateEnum
CREATE TYPE "SourceUploadStatus" AS ENUM ('pending', 'ready', 'failed');

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN "sourceUploadStatus" "SourceUploadStatus" NOT NULL DEFAULT 'ready';
ALTER TABLE "chapters" ADD COLUMN "sourceUploadError" TEXT;
