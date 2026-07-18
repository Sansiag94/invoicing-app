ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'twint';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'cash';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'revolut';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'other';

ALTER TYPE "InvoiceReminderType" ADD VALUE IF NOT EXISTS 'after_due_14_days';
ALTER TYPE "InvoiceReminderType" ADD VALUE IF NOT EXISTS 'after_due_30_days';

ALTER TABLE "Payment" ADD COLUMN "note" TEXT;
ALTER TABLE "Payment" ADD COLUMN "paidAt" TIMESTAMP(3);
