-- Phase 2 Database Changes
-- Add denomination field to Product table
ALTER TABLE "Product" ADD COLUMN "denomination" TEXT;

-- Add MartiStockUpload table
CREATE TABLE "MartiStockUpload" (
    "id" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalCodes" INTEGER NOT NULL,
    "denomination" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MartiStockUpload_pkey" PRIMARY KEY ("id")
);

-- Create index on denomination for faster queries
CREATE INDEX "Product_denomination_idx" ON "Product"("denomination");
CREATE INDEX "MartiStockUpload_denomination_idx" ON "MartiStockUpload"("denomination");
