CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SELLER', 'PLATFORM_MANAGER');
CREATE TYPE "ParticipantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "AssetCategory" AS ENUM ('BANK', 'FINTECH', 'PAYMENT', 'EMI', 'CRYPTO');
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'LICENSE_ONLY', 'PRE_REVENUE', 'DORMANT', 'PROFITABLE');
CREATE TYPE "ModerationActionType" AS ENUM ('SUSPEND', 'RESTORE', 'REMOVE');

CREATE TABLE "DemoWorkspace" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "role" "UserRole" NOT NULL,
  "status" "ParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
  "name" VARCHAR(120) NOT NULL,
  "organization" VARCHAR(160) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "normalizedEmail" VARCHAR(254) NOT NULL,
  "countryCode" VARCHAR(2) NOT NULL,
  "profileSummary" VARCHAR(1200) NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuyerProfile" (
  "userId" UUID NOT NULL,
  "investmentThesis" VARCHAR(2000) NOT NULL,
  "budgetMinEur" INTEGER NOT NULL,
  "budgetMaxEur" INTEGER NOT NULL,
  "targetCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "targetCategories" "AssetCategory"[] NOT NULL DEFAULT ARRAY[]::"AssetCategory"[],
  "targetLicenseTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "targetBusinessStatuses" "BusinessStatus"[] NOT NULL DEFAULT ARRAY[]::"BusinessStatus"[],
  "minEmployees" INTEGER,
  "maxEmployees" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "BuyerProfile_budget_check" CHECK ("budgetMinEur" >= 0 AND "budgetMaxEur" >= "budgetMinEur"),
  CONSTRAINT "BuyerProfile_employee_check" CHECK ("minEmployees" IS NULL OR "maxEmployees" IS NULL OR "maxEmployees" >= "minEmployees")
);

CREATE TABLE "Asset" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "sellerId" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "normalizedTitle" VARCHAR(160) NOT NULL,
  "summary" VARCHAR(320) NOT NULL,
  "description" VARCHAR(5000) NOT NULL,
  "category" "AssetCategory" NOT NULL,
  "countryCode" VARCHAR(2) NOT NULL,
  "licenseType" VARCHAR(120),
  "regulator" VARCHAR(120),
  "businessStatus" "BusinessStatus" NOT NULL,
  "askingPriceEur" INTEGER NOT NULL,
  "employeeCount" INTEGER,
  "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Asset_price_check" CHECK ("askingPriceEur" >= 0),
  CONSTRAINT "Asset_employee_check" CHECK ("employeeCount" IS NULL OR "employeeCount" >= 0)
);

CREATE TABLE "ContactRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "senderId" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "assetId" UUID,
  "subject" VARCHAR(160) NOT NULL,
  "message" VARCHAR(2000) NOT NULL,
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContactRequest_not_self" CHECK ("senderId" <> "recipientId")
);

CREATE TABLE "ModerationAction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "managerId" UUID NOT NULL,
  "targetUserId" UUID NOT NULL,
  "action" "ModerationActionType" NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "previousStatus" "ParticipantStatus" NOT NULL,
  "nextStatus" "ParticipantStatus" NOT NULL,
  "affectedAssets" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_workspace_email_key" ON "User"("workspaceId", "normalizedEmail");
CREATE INDEX "User_workspace_role_status_idx" ON "User"("workspaceId", "role", "status", "organization");
CREATE UNIQUE INDEX "Asset_title_key" ON "Asset"("workspaceId", "sellerId", "normalizedTitle");
CREATE INDEX "Asset_marketplace_idx" ON "Asset"("workspaceId", "category", "countryCode", "businessStatus", "askingPriceEur", "createdAt");
CREATE INDEX "Asset_seller_idx" ON "Asset"("workspaceId", "sellerId", "updatedAt");
CREATE UNIQUE INDEX "Contact_idempotency_key" ON "ContactRequest"("workspaceId", "senderId", "idempotencyKey");
CREATE INDEX "Contact_sender_idx" ON "ContactRequest"("workspaceId", "senderId", "createdAt");
CREATE INDEX "Contact_recipient_idx" ON "ContactRequest"("workspaceId", "recipientId", "createdAt");
CREATE INDEX "Moderation_created_idx" ON "ModerationAction"("workspaceId", "createdAt");
CREATE INDEX "Moderation_target_idx" ON "ModerationAction"("workspaceId", "targetUserId", "createdAt");
CREATE INDEX "DemoWorkspace_expiry_idx" ON "DemoWorkspace"("expiresAt");

ALTER TABLE "User" ADD CONSTRAINT "User_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "DemoWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "DemoWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_seller_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContactRequest" ADD CONSTRAINT "Contact_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "DemoWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactRequest" ADD CONSTRAINT "Contact_sender_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContactRequest" ADD CONSTRAINT "Contact_recipient_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContactRequest" ADD CONSTRAINT "Contact_asset_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "Moderation_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "DemoWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "Moderation_manager_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "Moderation_target_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
