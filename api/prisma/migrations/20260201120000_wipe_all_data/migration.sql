-- Wipe all data: truncate tables in FK-safe order (children first).
-- Run this migration only when you want to clear the database and start from zero.

TRUNCATE TABLE
  reviews,
  offers,
  requests,
  parent_profiles,
  specialist_profiles,
  specialist_portfolio,
  shop_products,
  shop_profiles,
  shop_promotions,
  profiles,
  users,
  banners
RESTART IDENTITY CASCADE;
