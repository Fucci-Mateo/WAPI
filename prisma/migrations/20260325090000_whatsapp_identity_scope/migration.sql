-- Add portfolio scope to customer contacts and service windows.
-- Backfill existing rows into a legacy scope so the new composite indexes can be added safely.

ALTER TABLE "Contact" ADD COLUMN "wabaId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "businessScopedUserId" TEXT;
UPDATE "Contact" SET "wabaId" = 'legacy' WHERE "wabaId" IS NULL;
ALTER TABLE "Contact" ALTER COLUMN "wabaId" SET NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "phoneNumber" DROP NOT NULL;

ALTER TABLE "CustomerServiceWindow" ADD COLUMN "wabaId" TEXT;
UPDATE "CustomerServiceWindow" SET "wabaId" = 'legacy' WHERE "wabaId" IS NULL;
ALTER TABLE "CustomerServiceWindow" ALTER COLUMN "wabaId" SET NOT NULL;

DROP INDEX IF EXISTS "Contact_phoneNumber_key";
DROP INDEX IF EXISTS "CustomerServiceWindow_phoneNumber_key";
DROP INDEX IF EXISTS "Contact_wabaId_idx";
DROP INDEX IF EXISTS "Contact_phoneNumber_idx";
DROP INDEX IF EXISTS "Contact_businessScopedUserId_idx";
DROP INDEX IF EXISTS "CustomerServiceWindow_wabaId_idx";
DROP INDEX IF EXISTS "CustomerServiceWindow_phoneNumber_idx";

CREATE UNIQUE INDEX "Contact_wabaId_phoneNumber_key" ON "Contact"("wabaId", "phoneNumber");
CREATE UNIQUE INDEX "Contact_wabaId_businessScopedUserId_key" ON "Contact"("wabaId", "businessScopedUserId");
CREATE INDEX "Contact_wabaId_idx" ON "Contact"("wabaId");
CREATE INDEX "Contact_phoneNumber_idx" ON "Contact"("phoneNumber");
CREATE INDEX "Contact_businessScopedUserId_idx" ON "Contact"("businessScopedUserId");

CREATE UNIQUE INDEX "CustomerServiceWindow_wabaId_phoneNumber_key" ON "CustomerServiceWindow"("wabaId", "phoneNumber");
CREATE INDEX "CustomerServiceWindow_wabaId_idx" ON "CustomerServiceWindow"("wabaId");
CREATE INDEX "CustomerServiceWindow_phoneNumber_idx" ON "CustomerServiceWindow"("phoneNumber");
