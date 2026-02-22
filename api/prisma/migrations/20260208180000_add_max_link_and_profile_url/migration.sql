-- AlterTable: add max_id, max_profile_url; make telegram_id nullable (for MAX-only users)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "max_id" BIGINT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "max_profile_url" TEXT;
ALTER TABLE "users" ALTER COLUMN "telegram_id" DROP NOT NULL;

-- CreateUniqueIndex (max_id unique)
CREATE UNIQUE INDEX IF NOT EXISTS "users_max_id_key" ON "users"("max_id");

-- CreateTable link_codes (for Telegram/MAX account linking)
CREATE TABLE IF NOT EXISTS "link_codes" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "link_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "link_codes_code_key" ON "link_codes"("code");
CREATE INDEX IF NOT EXISTS "idx_link_codes_expires_at" ON "link_codes"("expires_at");

ALTER TABLE "link_codes" ADD CONSTRAINT "link_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
