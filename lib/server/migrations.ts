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

export function runMigrations(db: Database): void {
  for (const { table, column, definition } of COLUMNS) {
    const exists = (
      db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    ).some((c) => c.name === column);

    if (!exists) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  }
}
