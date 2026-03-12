ALTER TABLE "Business"
ADD COLUMN "ownerName" TEXT,
ADD COLUMN "invoiceSenderType" TEXT NOT NULL DEFAULT 'company';
