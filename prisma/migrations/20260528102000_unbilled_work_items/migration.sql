-- CreateEnum
CREATE TYPE "UnbilledWorkStatus" AS ENUM ('unbilled', 'added_to_draft', 'invoiced');

-- CreateTable
CREATE TABLE "UnbilledWorkItem" (
    "uuid" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "UnbilledWorkStatus" NOT NULL DEFAULT 'unbilled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnbilledWorkItem_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE INDEX "UnbilledWorkItem_businessId_clientId_status_serviceDate_idx" ON "UnbilledWorkItem"("businessId", "clientId", "status", "serviceDate");

-- CreateIndex
CREATE INDEX "UnbilledWorkItem_invoiceId_idx" ON "UnbilledWorkItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "UnbilledWorkItem" ADD CONSTRAINT "UnbilledWorkItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnbilledWorkItem" ADD CONSTRAINT "UnbilledWorkItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnbilledWorkItem" ADD CONSTRAINT "UnbilledWorkItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
