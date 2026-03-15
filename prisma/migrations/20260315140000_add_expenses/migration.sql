CREATE TYPE "public"."ExpenseCategory" AS ENUM (
  'software',
  'office',
  'travel',
  'equipment',
  'tax',
  'subcontractor',
  'marketing',
  'meals',
  'education',
  'other'
);

CREATE TABLE "public"."Expense" (
  "uuid" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "vendor" TEXT,
  "description" TEXT NOT NULL,
  "category" "public"."ExpenseCategory" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Expense_pkey" PRIMARY KEY ("uuid")
);

CREATE INDEX "Expense_businessId_expenseDate_idx" ON "public"."Expense"("businessId", "expenseDate");
CREATE INDEX "Expense_businessId_category_idx" ON "public"."Expense"("businessId", "category");

ALTER TABLE "public"."Expense"
ADD CONSTRAINT "Expense_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "public"."Business"("uuid")
ON DELETE CASCADE ON UPDATE CASCADE;
