-- CreateTable
CREATE TABLE "moods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hexcode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moods_name_key" ON "moods"("name");

-- AlterTable
ALTER TABLE "audiobooks" ADD COLUMN "moodId" TEXT;

-- CreateIndex
CREATE INDEX "audiobooks_moodId_idx" ON "audiobooks"("moodId");

-- AddForeignKey
ALTER TABLE "audiobooks" ADD CONSTRAINT "audiobooks_moodId_fkey" FOREIGN KEY ("moodId") REFERENCES "moods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
