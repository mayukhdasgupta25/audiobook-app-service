-- Genres are modeled via audiobook_genres (many-to-many); remove redundant column on audiobooks.
ALTER TABLE "audiobooks" DROP CONSTRAINT IF EXISTS "audiobooks_genreId_fkey";

ALTER TABLE "audiobooks" DROP COLUMN IF EXISTS "genreId";
