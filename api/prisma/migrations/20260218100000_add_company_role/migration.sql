-- Add "company" to profile_type enum
ALTER TYPE "profile_type" ADD VALUE 'company';

-- CreateTable: данные компании (название, ИНН, юрадрес)
CREATE TABLE IF NOT EXISTS "company_profiles" (
  "profile_id" BIGINT NOT NULL,
  "company_name" TEXT NOT NULL,
  "inn" TEXT,
  "legal_address" TEXT,
  CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("profile_id")
);

DO $$ BEGIN
  ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
