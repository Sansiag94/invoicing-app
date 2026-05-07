-- AlterTable
ALTER TABLE "User" ADD COLUMN "appLanguage" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "otherCategoryName" TEXT;

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "uuid" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "defaultQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "uuid" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "emailStatus" TEXT NOT NULL DEFAULT 'pending',
    "emailSentAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE INDEX "PortfolioItem_businessId_active_idx" ON "PortfolioItem"("businessId", "active");

-- CreateIndex
CREATE INDEX "PortfolioItem_businessId_name_idx" ON "PortfolioItem"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_businessId_month_key" ON "MonthlyReport"("businessId", "month");

-- CreateIndex
CREATE INDEX "MonthlyReport_businessId_generatedAt_idx" ON "MonthlyReport"("businessId", "generatedAt");

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
