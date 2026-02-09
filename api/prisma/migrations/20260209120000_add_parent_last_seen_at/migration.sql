-- AlterTable
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "parent_last_seen_at" TIMESTAMPTZ(6);
