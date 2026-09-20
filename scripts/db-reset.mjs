/**
 * Deletes the local database so the next start re-seeds from scratch.
 *
 *   npm run db:reset
 */

import fs from "node:fs";
import path from "node:path";

const DB_FILE =
  process.env.ZEVORA_DB_FILE ?? path.join(process.cwd(), ".data", "zevora.db");

let removed = 0;
for (const suffix of ["", "-wal", "-shm"]) {
  const file = DB_FILE + suffix;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    removed++;
  }
}

console.log(
  removed > 0
    ? `База удалена (${DB_FILE}). Запустите npm run dev — она пересоздастся и заполнится.`
    : `База не найдена (${DB_FILE}) — нечего удалять.`,
);
