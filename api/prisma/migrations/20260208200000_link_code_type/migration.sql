-- AlterTable
ALTER TABLE "link_codes" ADD COLUMN IF NOT EXISTS "link_type" TEXT NOT NULL DEFAULT 'telegram';
