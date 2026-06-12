-- Migrate MEMBER → ADMIN and remove MEMBER from OrganizationRole enum
UPDATE "organization_members" SET "role" = 'ADMIN' WHERE "role" = 'MEMBER';

CREATE TYPE "OrganizationRole_new" AS ENUM ('OWNER', 'ADMIN');

ALTER TABLE "organization_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "organization_members" ALTER COLUMN "role" TYPE "OrganizationRole_new" USING (
  CASE "role"::text
    WHEN 'OWNER' THEN 'OWNER'::"OrganizationRole_new"
    WHEN 'ADMIN' THEN 'ADMIN'::"OrganizationRole_new"
    WHEN 'MEMBER' THEN 'ADMIN'::"OrganizationRole_new"
    ELSE 'ADMIN'::"OrganizationRole_new"
  END
);
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DEFAULT 'ADMIN'::"OrganizationRole_new";

DROP TYPE "OrganizationRole";
ALTER TYPE "OrganizationRole_new" RENAME TO "OrganizationRole";
