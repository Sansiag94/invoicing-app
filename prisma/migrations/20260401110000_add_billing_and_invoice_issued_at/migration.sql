ALTER TABLE "Business"
ADD COLUMN "planTier" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "stripeSubscriptionStatus" TEXT,
ADD COLUMN "stripePriceId" TEXT,
ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3);

ALTER TABLE "Invoice"
ADD COLUMN "issuedAt" TIMESTAMP(3);

UPDATE "Invoice"
SET "issuedAt" = "createdAt"
WHERE "issuedAt" IS NULL
  AND "status" <> 'draft';

CREATE UNIQUE INDEX "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");
CREATE UNIQUE INDEX "Business_stripeSubscriptionId_key" ON "Business"("stripeSubscriptionId");
CREATE INDEX "Invoice_businessId_issuedAt_idx" ON "Invoice"("businessId", "issuedAt");
