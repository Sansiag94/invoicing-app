ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "usesPlatformStripe" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Business"
SET "usesPlatformStripe" = true
WHERE "uuid" = '012785fb-a9e9-48dc-bd96-9b135d55759f';
