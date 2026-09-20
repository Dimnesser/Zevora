import "server-only";

import { getDb } from "@/lib/server/db";
import { seed } from "@/lib/server/seed";

let ready = false;

/**
 * Opens the database and seeds it on first use.
 *
 * Every route handler calls this before touching data, so a fresh clone
 * works with nothing but `npm run dev` — no migration step to forget.
 */
export function bootstrap(): void {
  if (ready) return;
  getDb();
  seed();
  ready = true;
}
