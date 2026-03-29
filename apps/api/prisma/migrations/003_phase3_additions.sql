-- Phase 3 Database Changes
-- Add country code to SalesChannel table
ALTER TABLE "SalesChannel" ADD COLUMN "countryCode" TEXT;

-- Add name and forcePasswordChange to User table
ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ADD COLUMN "forcePasswordChange" BOOLEAN DEFAULT false;

-- Update existing users to have a default name (you may want to update this with actual names)
UPDATE "User" SET "name" = email WHERE "name" IS NULL;

-- Create indexes for performance
CREATE INDEX "SalesChannel_countryCode_idx" ON "SalesChannel"("countryCode");
CREATE INDEX "User_name_idx" ON "User"("name");
CREATE INDEX "User_forcePasswordChange_idx" ON "User"("forcePasswordChange");
