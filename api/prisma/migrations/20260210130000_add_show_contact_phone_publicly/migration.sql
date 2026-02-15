-- AlterTable
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "show_contact_phone_publicly" BOOLEAN NOT NULL DEFAULT false;
