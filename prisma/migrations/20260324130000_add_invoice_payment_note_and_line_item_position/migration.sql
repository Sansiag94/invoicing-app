ALTER TABLE "Invoice"
ADD COLUMN "paymentNote" TEXT;

ALTER TABLE "LineItem"
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ranked_line_items AS (
  SELECT
    "uuid",
    ROW_NUMBER() OVER (PARTITION BY "invoiceId" ORDER BY "createdAt", "uuid") - 1 AS row_position
  FROM "LineItem"
)
UPDATE "LineItem"
SET "position" = ranked_line_items.row_position
FROM ranked_line_items
WHERE "LineItem"."uuid" = ranked_line_items."uuid";
