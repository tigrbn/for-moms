DO $$ BEGIN
  CREATE TYPE profile_type AS ENUM ('parent', 'specialist', 'shop');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('active', 'in_progress', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  telegram_id     BIGINT UNIQUE NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  username        TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            profile_type NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  display_name    TEXT,
  avatar_url      TEXT,
  city            TEXT,
  district        TEXT,

  rating_avg      NUMERIC(2,1) NOT NULL DEFAULT 0.0,
  rating_count    INT NOT NULL DEFAULT 0,

  promoted_until  TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, type)
);

-- active profile (role switch)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active_profile_id BIGINT;

DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_active_profile_id_fkey
    FOREIGN KEY (active_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS parent_profiles (
  profile_id          BIGINT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  children_ages       JSONB,
  special_wishes      TEXT
);

CREATE TABLE IF NOT EXISTS specialist_profiles (
  profile_id          BIGINT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  skills              JSONB,
  experience_years    INT,
  age_groups          JSONB,
  price_per_hour      INT,
  work_districts      JSONB,
  about               TEXT
);

CREATE TABLE IF NOT EXISTS specialist_portfolio (
  id              BIGSERIAL PRIMARY KEY,
  profile_id      BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_profiles (
  profile_id      BIGINT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  shop_name       TEXT,
  logo_url        TEXT,
  description     TEXT,
  address         TEXT,
  work_hours      TEXT,
  contacts        JSONB,
  categories      JSONB
);

CREATE TABLE IF NOT EXISTS shop_products (
  id              BIGSERIAL PRIMARY KEY,
  profile_id      BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  price           INT,
  category        TEXT,
  image_urls      JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests (
  id              BIGSERIAL PRIMARY KEY,
  parent_profile_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  child_age       INT,
  description     TEXT,
  start_at        TIMESTAMPTZ,
  duration_min    INT,
  budget          INT,
  district        TEXT,
  status          request_status NOT NULL DEFAULT 'active',
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offers (
  id              BIGSERIAL PRIMARY KEY,
  request_id      BIGINT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  specialist_profile_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price_offer     INT,
  comment         TEXT,
  status          offer_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, specialist_profile_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id              BIGSERIAL PRIMARY KEY,
  from_profile_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id   BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id      BIGINT REFERENCES requests(id) ON DELETE SET NULL,
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text            TEXT,
  is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banners (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT,
  image_url       TEXT NOT NULL,
  target_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  placements      JSONB,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_type_active ON profiles(type, is_active);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_offers_request ON offers(request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_to_profile ON reviews(to_profile_id);
