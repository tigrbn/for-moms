-- AlterTable: фото в заявках
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "images" JSONB;

-- CreateTable: просмотры заявок специалистами (конверсии)
CREATE TABLE IF NOT EXISTS "request_views" (
  "id" BIGSERIAL NOT NULL,
  "request_id" BIGINT NOT NULL,
  "specialist_profile_id" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "request_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_request_views_request" ON "request_views"("request_id");
CREATE INDEX IF NOT EXISTS "idx_request_views_specialist_created" ON "request_views"("specialist_profile_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "request_views" ADD CONSTRAINT "request_views_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "request_views" ADD CONSTRAINT "request_views_specialist_profile_id_fkey"
    FOREIGN KEY ("specialist_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
