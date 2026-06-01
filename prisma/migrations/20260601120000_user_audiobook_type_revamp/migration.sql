-- Migrate UPLOADED rows to PURCHASED before removing enum value
UPDATE "user_audiobooks" SET "type" = 'PURCHASED' WHERE "type" = 'UPLOADED';

-- Recreate enum without UPLOADED
CREATE TYPE "UserAudioBookType_new" AS ENUM ('OWNED', 'PURCHASED');

ALTER TABLE "user_audiobooks" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "user_audiobooks" ALTER COLUMN "type" TYPE "UserAudioBookType_new" USING ("type"::text::"UserAudioBookType_new");

ALTER TYPE "UserAudioBookType" RENAME TO "UserAudioBookType_old";
ALTER TYPE "UserAudioBookType_new" RENAME TO "UserAudioBookType";
DROP TYPE "UserAudioBookType_old";

ALTER TABLE "user_audiobooks" ALTER COLUMN "type" SET DEFAULT 'PURCHASED';
