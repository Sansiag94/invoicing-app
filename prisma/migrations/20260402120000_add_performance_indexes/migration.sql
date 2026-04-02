CREATE INDEX "Client_businessId_email_idx" ON "Client"("businessId", "email");

CREATE INDEX "Invoice_businessId_createdAt_idx" ON "Invoice"("businessId", "createdAt");
CREATE INDEX "Invoice_businessId_status_dueDate_idx" ON "Invoice"("businessId", "status", "dueDate");
CREATE INDEX "Invoice_businessId_status_issueDate_idx" ON "Invoice"("businessId", "status", "issueDate");

CREATE INDEX "Payment_invoiceId_createdAt_idx" ON "Payment"("invoiceId", "createdAt");
