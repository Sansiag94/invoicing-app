ALTER TABLE "Business"
ADD COLUMN "replyToEmail" TEXT,
ADD COLUMN "defaultPaymentTermDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "defaultInvoiceMessage" TEXT,
ADD COLUMN "defaultInvoiceAttachmentUrl" TEXT,
ADD COLUMN "defaultInvoiceAttachmentName" TEXT;
