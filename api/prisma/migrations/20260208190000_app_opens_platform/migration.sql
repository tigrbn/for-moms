-- AlterTable
ALTER TABLE "app_opens" ADD COLUMN IF NOT EXISTS "platform" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_app_opens_platform_opened_at" ON "app_opens"("platform", "opened_at");
