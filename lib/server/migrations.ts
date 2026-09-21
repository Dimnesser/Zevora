import "server-only";

import type { Database } from "better-sqlite3";

/**
 * Additive migrations.
 *
 * schema.sql uses CREATE TABLE IF NOT EXISTS, which silently skips a table
 * that already exists — so a database created by an earlier version never
 * picks up new columns. Each entry here adds one column if it is missing,
 * which is safe to run on every boot and on a fresh database alike.
 */
const COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: "skins", column: "market_hash_name", definition: "TEXT" },
  { table: "skins", column: "image_url", definition: "TEXT" },
  { table: "skins", column: "image_source", definition: "TEXT" },
  {
    table: "skins",
    column: "image_status",
    definition: "TEXT NOT NULL DEFAULT 'pending'",
  },
  { table: "skins", column: "image_checked_at", definition: "INTEGER" },
  { table: "skin_images", column: "http_status", definition: "INTEGER" },
  { table: "skin_images", column: "content_type", definition: "TEXT" },
  { table: "skin_images", column: "bytes", definition: "INTEGER" },
  { table: "skin_images", column: "width", definition: "INTEGER" },
  { table: "skin_images", column: "height", definition: "INTEGER" },
  { table: "skin_images", column: "checked_at", definition: "INTEGER" },
];

/**
 * Widens `inventory_items.source` to allow 'contract'.
 *
 * A CHECK constraint cannot be altered in place, so the table is rebuilt:
 * the one case in this schema where an additive column is not enough. The
 * rebuild is guarded on the constraint text, so it runs once and is a
 * no-op on a database created from the current schema.
 */
function allowContractSource(db: Database): void {
  const ddl = (
    db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'inventory_items'`)
      .get() as { sql: string } | undefined
  )?.sql;

  // No table yet (fresh database — schema.sql runs first) or already wide.
  if (!ddl || ddl.includes("'contract'")) return;

  const rebuild = db.transaction(() => {
    db.exec(`
      CREATE TABLE inventory_items__new (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skin_id        INTEGER NOT NULL REFERENCES skins(id) ON DELETE RESTRICT,
        price_minor    INTEGER NOT NULL CHECK (price_minor >= 0),
        wear           TEXT    NOT NULL,
        float_value    REAL    NOT NULL CHECK (float_value >= 0 AND float_value <= 1),
        stattrak       INTEGER NOT NULL DEFAULT 0,
        source         TEXT    NOT NULL CHECK (source IN ('case','upgrade','shop','bonus','starter','contract')),
        source_case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
        status         TEXT    NOT NULL DEFAULT 'owned'
                         CHECK (status IN ('owned','withdrawing','withdrawn','sold','consumed')),
        acquired_at    INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL
      );
      INSERT INTO inventory_items__new
        SELECT id, user_id, skin_id, price_minor, wear, float_value, stattrak,
               source, source_case_id, status, acquired_at, updated_at
          FROM inventory_items;
      DROP TABLE inventory_items;
      ALTER TABLE inventory_items__new RENAME TO inventory_items;
      CREATE INDEX IF NOT EXISTS idx_inventory_user
        ON inventory_items(user_id, status, acquired_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inventory_skin ON inventory_items(skin_id);
    `);
  });

  // Foreign keys must be off across the DROP: case_openings references
  // this table, and SQLite would otherwise reject the swap. The pragma
  // cannot be changed inside a transaction, hence the order here.
  db.pragma("foreign_keys = OFF");
  try {
    rebuild();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

export function runMigrations(db: Database): void {
  for (const { table, column, definition } of COLUMNS) {
    const exists = (
      db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    ).some((c) => c.name === column);

    if (!exists) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  }

  allowContractSource(db);
}
