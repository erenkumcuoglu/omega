-- Phase 4 Database Changes

-- Create StockAlert table
CREATE TABLE "StockAlert" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "alertType" TEXT NOT NULL,
  "threshold" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notifyEmail" TEXT[],
  "lastTriggeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- Create Notification table
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB NOT NULL DEFAULT '{}',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Create ExcessCode table
CREATE TABLE "ExcessCode" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "channelId" TEXT,
  "digitalCode" TEXT NOT NULL,
  "providerOrderNo" TEXT,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExcessCode_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance optimization
-- Order table indexes
CREATE INDEX "Order_channelId_orderedAt_idx" ON "Order"("channelId", "orderedAt");
CREATE INDEX "Order_providerId_orderedAt_idx" ON "Order"("providerId", "orderedAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_idempotencyKey_idx" ON "Order"("idempotencyKey");

-- AuditLog table indexes
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- Product table indexes
CREATE INDEX "Product_providerId_isActive_idx" ON "Product"("providerId", "isActive");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- StockAlert table indexes
CREATE INDEX "StockAlert_productId_idx" ON "StockAlert"("productId");
CREATE INDEX "StockAlert_alertType_isActive_idx" ON "StockAlert"("alertType", "isActive");

-- Notification table indexes
CREATE INDEX "Notification_isRead_createdAt_idx" ON "Notification"("isRead", "createdAt");
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- ExcessCode table indexes
CREATE INDEX "ExcessCode_productId_status_idx" ON "ExcessCode"("productId", "status");
CREATE INDEX "ExcessCode_channelId_status_idx" ON "ExcessCode"("channelId", "status");
CREATE INDEX "ExcessCode_status_createdAt_idx" ON "ExcessCode"("status", "createdAt");

-- Add foreign key constraints
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExcessCode" ADD CONSTRAINT "ExcessCode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExcessCode" ADD CONSTRAINT "ExcessCode_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "SalesChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
