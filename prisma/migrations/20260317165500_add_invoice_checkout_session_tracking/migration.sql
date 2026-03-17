ALTER TABLE "Invoice"
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripeCheckoutSessionExpiresAt" TIMESTAMP(3);

CREATE INDEX "Invoice_stripeCheckoutSessionId_idx" ON "Invoice"("stripeCheckoutSessionId");
