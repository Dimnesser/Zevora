import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { runMigrations } from "@/lib/server/migrations";

/**
 * Single shared SQLite handle.
 *
 * better-sqlite3 is synchronous, which suits this workload: every request
 * does a handful of indexed lookups and one short write transaction, so
 * there is nothing to await and no connection pool to manage. Combined
 * with Node's single-threaded execution it also means a transaction body
 * can never be interleaved with another request's statements.
 */

const DB_DIR = process.env.ZEVORA_DB_DIR ?? path.join(process.cwd(), ".data");
const DB_FILE = process.env.ZEVORA_DB_FILE ?? path.join(DB_DIR, "zevora.db");

declare global {
  // Survives hot reloads in dev, where modules are re-evaluated.
  // eslint-disable-next-line no-var
  var __zevoraDb: Database.Database | undefined;
}

function openDatabase(): Database.Database {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

  const db = new Database(DB_FILE);

  // WAL lets readers run while a writer holds the lock.
  db.pragma("journal_mode = WAL");
  // Foreign keys are OFF by default in SQLite and must be enabled per
  // connection, otherwise every REFERENCES clause is decorative.
  db.pragma("foreign_keys = ON");
  // Wait instead of failing instantly when another writer holds the lock.
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");

  const schema = fs.readFileSync(
    path.join(process.cwd(), "lib/server/schema.sql"),
    "utf8",
  );
  db.exec(schema);
  // Brings a database created by an earlier version up to date.
  runMigrations(db);

  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__zevoraDb) {
    globalThis.__zevoraDb = openDatabase();
  }
  return globalThis.__zevoraDb;
}

/**
 * Runs `fn` inside an immediate transaction.
 *
 * BEGIN IMMEDIATE takes the write lock up front rather than on the first
 * write, so two concurrent openings cannot both read a balance, both
 * decide it is sufficient, and both debit it.
 */
export function transact<T>(fn: () => T): T {
  const db = getDb();
  const wrapped = db.transaction(fn);
  return wrapped.immediate();
}

export const now = () => Date.now();
