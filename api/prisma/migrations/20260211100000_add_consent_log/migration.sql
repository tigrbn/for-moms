-- CreateTable
CREATE TABLE "consent_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "document_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_consent_log_user" ON "consent_log"("user_id");

-- AddForeignKey
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
