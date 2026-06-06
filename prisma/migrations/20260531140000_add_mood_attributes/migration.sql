-- AlterTable
ALTER TABLE "moods" ADD COLUMN "description_icon" TEXT NOT NULL DEFAULT '';

ALTER TABLE "moods" ALTER COLUMN "description_icon" DROP DEFAULT;

-- CreateTable
CREATE TABLE "mood_attributes" (
    "id" TEXT NOT NULL,
    "moodId" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mood_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mood_attributes_moodId_idx" ON "mood_attributes"("moodId");

-- AddForeignKey
ALTER TABLE "mood_attributes" ADD CONSTRAINT "mood_attributes_moodId_fkey" FOREIGN KEY ("moodId") REFERENCES "moods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
