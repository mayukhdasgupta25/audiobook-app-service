-- Drop chapter thumbnail columns and add image spec tables
ALTER TABLE "chapters" DROP COLUMN IF EXISTS "chapterCardCoverImage";
ALTER TABLE "chapters" DROP COLUMN IF EXISTS "maximizedChapterCoverImage";
ALTER TABLE "chapters" DROP COLUMN IF EXISTS "minimizedChapterCoverImage";

CREATE TYPE "ImageCategory" AS ENUM ('audiobook', 'chapter', 'user', 'author');

CREATE TABLE "image_placeholder_specs" (
    "id" TEXT NOT NULL,
    "category" "ImageCategory" NOT NULL,
    "variantKey" TEXT NOT NULL,
    "actualWidth" INTEGER NOT NULL,
    "actualHeight" INTEGER NOT NULL,
    "aspectRatioWidth" INTEGER NOT NULL,
    "aspectRatioHeight" INTEGER NOT NULL,
    "recommendedMaxWidth" INTEGER NOT NULL,
    "recommendedMaxHeight" INTEGER NOT NULL,
    CONSTRAINT "image_placeholder_specs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "image_placeholder_specs_category_variantKey_key" ON "image_placeholder_specs"("category", "variantKey");

CREATE TABLE "image_assets" (
    "id" TEXT NOT NULL,
    "category" "ImageCategory" NOT NULL,
    "entityId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "image_assets_category_entityId_variantKey_key" ON "image_assets"("category", "entityId", "variantKey");
CREATE INDEX "image_assets_category_entityId_idx" ON "image_assets"("category", "entityId");
