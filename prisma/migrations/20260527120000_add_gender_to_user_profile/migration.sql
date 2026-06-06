-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "gender" "Gender";
