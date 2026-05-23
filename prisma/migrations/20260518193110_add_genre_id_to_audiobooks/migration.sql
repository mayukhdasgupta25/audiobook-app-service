-- Add genreId to audiobooks (required). Existing rows are backfilled before NOT NULL is enforced.

-- Step 1: Add column as nullable so existing rows can be migrated
ALTER TABLE "audiobooks" ADD COLUMN "genreId" TEXT;

-- Step 2: Prefer genre from audiobook_genres junction when present
UPDATE "audiobooks" AS a
SET "genreId" = sub."genreId"
FROM (
  SELECT DISTINCT ON ("audiobookId") "audiobookId", "genreId"
  FROM "audiobook_genres"
  ORDER BY "audiobookId", "createdAt" ASC
) AS sub
WHERE a."id" = sub."audiobookId"
  AND a."genreId" IS NULL;

-- Step 3: Assign default genre to any remaining audiobooks
UPDATE "audiobooks"
SET "genreId" = 'cmiu2qxwy000133u8xvokcnqg'
WHERE "genreId" IS NULL;

-- Step 4: Enforce NOT NULL
ALTER TABLE "audiobooks" ALTER COLUMN "genreId" SET NOT NULL;

-- Step 5: Foreign key to genres
ALTER TABLE "audiobooks" ADD CONSTRAINT "audiobooks_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
