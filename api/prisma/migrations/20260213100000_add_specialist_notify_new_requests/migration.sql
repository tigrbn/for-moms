-- AlterTable
ALTER TABLE "specialist_profiles" ADD COLUMN IF NOT EXISTS "notify_new_requests_in_category" BOOLEAN NOT NULL DEFAULT false;
