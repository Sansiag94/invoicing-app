/*
  Warnings:

  - You are about to drop the column `name` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "name",
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactName" TEXT;
