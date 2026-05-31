CREATE TABLE "InvoiceAttachment" (
  "uuid" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageBucket" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvoiceAttachment_pkey" PRIMARY KEY ("uuid")
);

CREATE INDEX "InvoiceAttachment_invoiceId_createdAt_idx" ON "InvoiceAttachment"("invoiceId", "createdAt");
CREATE INDEX "InvoiceAttachment_businessId_idx" ON "InvoiceAttachment"("businessId");

ALTER TABLE "InvoiceAttachment"
  ADD CONSTRAINT "InvoiceAttachment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("uuid")
  ON DELETE CASCADE ON UPDATE CASCADE;
