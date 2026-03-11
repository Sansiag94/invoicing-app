-- CreateEnum
CREATE TYPE "InvoiceReminderType" AS ENUM ('before_due_3_days', 'after_due_7_days');

-- CreateTable
CREATE TABLE "InvoiceReminder" (
    "uuid" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "InvoiceReminderType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReminder_invoiceId_type_key" ON "InvoiceReminder"("invoiceId", "type");

-- CreateIndex
CREATE INDEX "InvoiceReminder_type_sentAt_idx" ON "InvoiceReminder"("type", "sentAt");

-- AddForeignKey
ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
