-- Ensure age column exists (idempotent; use if profile_age migration was not applied)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "age" INTEGER;

-- Remove shop feature: drop shop tables (project no longer uses shop)
DROP TABLE IF EXISTS "shop_promotions" CASCADE;
DROP TABLE IF EXISTS "shop_products" CASCADE;
DROP TABLE IF EXISTS "shop_profiles" CASCADE;
