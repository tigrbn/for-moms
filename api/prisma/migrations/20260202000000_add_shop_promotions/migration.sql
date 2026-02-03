-- CreateTable
CREATE TABLE "shop_promotions" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "image_url" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_promotions_profile_id_idx" ON "shop_promotions"("profile_id");

-- AddForeignKey
ALTER TABLE "shop_promotions" ADD CONSTRAINT "shop_promotions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
