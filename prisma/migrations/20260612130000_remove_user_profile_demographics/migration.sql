-- DropEnum (only after column removed)
ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "firstName",
DROP COLUMN IF EXISTS "lastName",
DROP COLUMN IF EXISTS "address",
DROP COLUMN IF EXISTS "contact",
DROP COLUMN IF EXISTS "gender",
DROP COLUMN IF EXISTS "location",
DROP COLUMN IF EXISTS "age";

DROP TYPE IF EXISTS "Gender";
