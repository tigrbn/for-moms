-- CreateTable
CREATE TABLE "app_opens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_opens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_app_opens_opened_at" ON "app_opens"("opened_at");

-- AddForeignKey
ALTER TABLE "app_opens" ADD CONSTRAINT "app_opens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
