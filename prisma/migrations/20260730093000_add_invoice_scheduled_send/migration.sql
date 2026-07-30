ALTER TABLE "Invoice"
  ADD COLUMN "scheduledSendAt" TIMESTAMP(3),
  ADD COLUMN "scheduledSendFailure" TEXT;

CREATE INDEX "Invoice_businessId_status_scheduledSendAt_idx"
  ON "Invoice"("businessId", "status", "scheduledSendAt");
