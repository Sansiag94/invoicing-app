ALTER TABLE "Business"
ADD COLUMN "street" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "bankName" TEXT;

ALTER TABLE "Client"
ADD COLUMN "street" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "city" TEXT;

ALTER TABLE "Invoice"
ADD COLUMN "subject" TEXT,
ADD COLUMN "reference" TEXT;
