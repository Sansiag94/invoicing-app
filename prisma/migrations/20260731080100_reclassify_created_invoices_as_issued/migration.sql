UPDATE "Invoice" i
SET "status" = 'issued'::"InvoiceStatus"
WHERE i."status" = 'sent'::"InvoiceStatus"
  AND EXISTS (
    SELECT 1
    FROM "InvoiceEvent" e
    WHERE e."invoiceId" = i."uuid"
      AND e."type" = 'issued'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "InvoiceEvent" e
    WHERE e."invoiceId" = i."uuid"
      AND e."type" = 'sent'
  );
