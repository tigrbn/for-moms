-- CreateTable: визиты родителей (для конверсии Parent → Order в дашборде аналитики)
CREATE TABLE IF NOT EXISTS "parent_visits" (
  "id" BIGSERIAL NOT NULL,
  "parent_profile_id" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "parent_visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_parent_visits_profile_created" ON "parent_visits"("parent_profile_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "parent_visits" ADD CONSTRAINT "parent_visits_parent_profile_id_fkey"
    FOREIGN KEY ("parent_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
