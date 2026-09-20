-- ============================================================
--  ZEVORA — schema
--
--  Money is stored ONLY as integer minor units (копейки).
--  Never store currency as REAL: float arithmetic loses money.
--
--  SQLite is used as the embedded engine; the DDL deliberately
--  sticks to portable constructs so a Postgres migration is a
--  type-mapping exercise, not a rewrite.
-- ============================================================

-- ─────────────── users & auth ───────────────

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT    NOT NULL,
  password_salt   TEXT    NOT NULL,
  role            TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user','owner')),
  -- Balance may never go negative; this CHECK is the last line of
  -- defence behind the conditional UPDATE used when debiting.
  balance_minor   INTEGER NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
  avatar_seed     TEXT    NOT NULL,
  level           INTEGER NOT NULL DEFAULT 1,
  xp              INTEGER NOT NULL DEFAULT 0,

  -- Partner programme. Granted by the owner only; never self-serve.
  partner_tier    TEXT    CHECK (partner_tier IN ('partner','creator','elite','ambassador')),
  partner_since   INTEGER,
  promo_code      TEXT    UNIQUE COLLATE NOCASE,
  ref_code        TEXT    UNIQUE COLLATE NOCASE,
  partner_perks   TEXT,                       -- JSON array of perk ids
  partner_daily_minor   INTEGER,              -- owner override
  partner_ref_multiplier REAL,                -- owner override
  partner_campaigns TEXT,                     -- JSON array of campaign ids

  daily_claimed_at INTEGER,
  daily_streak    INTEGER NOT NULL DEFAULT 0,
  registration_bonus_claimed INTEGER NOT NULL DEFAULT 0,

  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  -- SHA-256 of the cookie token; the raw token never touches the DB.
  token_hash  TEXT    PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ─────────────── catalogue ───────────────

-- Rarities are rows, not an enum, so the owner can add their own.
CREATE TABLE IF NOT EXISTS rarities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  color       TEXT    NOT NULL,
  -- Suggested weight used when the admin adds a skin to a case.
  default_weight INTEGER NOT NULL DEFAULT 1000 CHECK (default_weight > 0),
  effect      TEXT    NOT NULL DEFAULT 'none'
                CHECK (effect IN ('none','glow','shine','pulse','aurora')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS skins (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT    NOT NULL UNIQUE,
  -- Full market name, e.g. "AK-47 | Redline".
  market_name      TEXT    NOT NULL UNIQUE,
  weapon           TEXT    NOT NULL,
  finish           TEXT    NOT NULL,
  rarity_id        INTEGER NOT NULL REFERENCES rarities(id) ON DELETE RESTRICT,
  base_price_minor INTEGER NOT NULL CHECK (base_price_minor > 0),
  stattrak_capable INTEGER NOT NULL DEFAULT 1,
  -- Fallback artwork parameters for the procedural SVG renderer,
  -- used whenever a skin has no image row yet.
  art_kind         TEXT    NOT NULL,
  art_pattern      TEXT    NOT NULL,
  art_color_a      TEXT    NOT NULL,
  art_color_b      TEXT    NOT NULL,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_skins_rarity ON skins(rarity_id);
CREATE INDEX IF NOT EXISTS idx_skins_price ON skins(base_price_minor);

-- One skin can carry several images (Steam CDN, local upload, …).
CREATE TABLE IF NOT EXISTS skin_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  skin_id    INTEGER NOT NULL REFERENCES skins(id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  source     TEXT    NOT NULL DEFAULT 'steam'
               CHECK (source IN ('steam','local','custom')),
  is_primary INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_skin_images_skin ON skin_images(skin_id, is_primary);

-- ─────────────── cases ───────────────

CREATE TABLE IF NOT EXISTS cases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  image_url   TEXT,
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  is_active   INTEGER NOT NULL DEFAULT 1,
  is_demo     INTEGER NOT NULL DEFAULT 1,
  -- Partner-only cases never appear in the public catalogue.
  partner_only INTEGER NOT NULL DEFAULT 0,
  tags        TEXT    NOT NULL DEFAULT '[]',   -- JSON array
  -- Procedural crate artwork used when image_url is null.
  art_emblem  TEXT    NOT NULL DEFAULT 'hex',
  art_color_a TEXT    NOT NULL DEFAULT '#6E71FF',
  art_color_b TEXT    NOT NULL DEFAULT '#22D3EE',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cases_active ON cases(is_active, sort_order);

CREATE TABLE IF NOT EXISTS case_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  skin_id      INTEGER NOT NULL REFERENCES skins(id) ON DELETE RESTRICT,
  -- Integer weight. Probability = weight / SUM(weight) over the case.
  weight       INTEGER NOT NULL CHECK (weight > 0),
  min_float    REAL    NOT NULL DEFAULT 0.0 CHECK (min_float >= 0 AND min_float <= 1),
  max_float    REAL    NOT NULL DEFAULT 1.0 CHECK (max_float >= 0 AND max_float <= 1),
  stattrak_enabled INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  -- A skin may appear in many cases, but only once per case.
  UNIQUE (case_id, skin_id),
  CHECK (min_float <= max_float)
);
CREATE INDEX IF NOT EXISTS idx_case_items_case ON case_items(case_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_case_items_skin ON case_items(skin_id);

-- ─────────────── player economy ───────────────

CREATE TABLE IF NOT EXISTS inventory_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin_id        INTEGER NOT NULL REFERENCES skins(id) ON DELETE RESTRICT,
  -- Price frozen at acquisition: wear and StatTrak modify the base price.
  price_minor    INTEGER NOT NULL CHECK (price_minor >= 0),
  wear           TEXT    NOT NULL,
  float_value    REAL    NOT NULL CHECK (float_value >= 0 AND float_value <= 1),
  stattrak       INTEGER NOT NULL DEFAULT 0,
  source         TEXT    NOT NULL CHECK (source IN ('case','upgrade','shop','bonus','starter')),
  source_case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
  status         TEXT    NOT NULL DEFAULT 'owned'
                   CHECK (status IN ('owned','withdrawing','withdrawn','sold','consumed')),
  acquired_at    INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory_items(user_id, status, acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_skin ON inventory_items(skin_id);

CREATE TABLE IF NOT EXISTS case_openings (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id           INTEGER NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  skin_id           INTEGER NOT NULL REFERENCES skins(id) ON DELETE RESTRICT,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  price_paid_minor  INTEGER NOT NULL CHECK (price_paid_minor >= 0),
  value_minor       INTEGER NOT NULL CHECK (value_minor >= 0),
  -- Audit trail: the exact ticket drawn and the pool it was drawn from,
  -- so any opening can be re-verified after the fact.
  roll              INTEGER NOT NULL,
  total_weight      INTEGER NOT NULL CHECK (total_weight > 0),
  created_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_openings_user ON case_openings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_openings_case ON case_openings(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_openings_recent ON case_openings(created_at DESC);

CREATE TABLE IF NOT EXISTS transactions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind                TEXT    NOT NULL CHECK (kind IN (
                        'deposit','withdraw','case','sell','shop',
                        'upgrade-win','upgrade-loss','bonus','promo','referral','admin')),
  label               TEXT    NOT NULL,
  -- Signed delta in minor units. Negative debits, positive credits.
  amount_minor        INTEGER NOT NULL,
  balance_after_minor INTEGER NOT NULL CHECK (balance_after_minor >= 0),
  ref_type            TEXT,
  ref_id              INTEGER,
  created_at          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at DESC);

-- ─────────────── idempotency ───────────────

-- A replayed request (double click, retry, flaky network) inserts the
-- same key, hits the PRIMARY KEY conflict and replays the stored
-- response instead of charging the user twice.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key           TEXT    NOT NULL,
  endpoint      TEXT    NOT NULL,
  response_json TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  -- Scoped per user: one account's key must never collide with another's,
  -- which a global PRIMARY KEY on `key` would allow.
  PRIMARY KEY (user_id, key)
);
CREATE INDEX IF NOT EXISTS idx_idem_created ON idempotency_keys(created_at);

-- Promo codes, including per-partner personal codes.
CREATE TABLE IF NOT EXISTS promo_codes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  amount_minor  INTEGER NOT NULL CHECK (amount_minor > 0),
  partner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promo_id   INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  -- One redemption per user per code.
  UNIQUE (user_id, promo_id)
);
