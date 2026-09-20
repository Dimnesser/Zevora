/**
 * Fills the skin_images table with real CS2 artwork.
 *
 * Source: the public CS2 API at https://bymykel.github.io/CSGO-API,
 * which publishes every skin with its Steam CDN image URL. The seed's
 * `market_name` values are the real market names, so matching is a
 * straight lookup by name.
 *
 *   npm run skins:images
 *
 * Until this runs, the site falls back to the procedural SVG renderer,
 * so it works offline — this step only upgrades the artwork.
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const API = process.env.SKINS_API ?? "https://bymykel.github.io/CSGO-API/api/en/skins.json";
const DB_FILE =
  process.env.ZEVORA_DB_FILE ?? path.join(process.cwd(), ".data", "zevora.db");

if (!fs.existsSync(DB_FILE)) {
  console.error(
    `База не найдена: ${DB_FILE}\nЗапустите приложение один раз (npm run dev), чтобы она создалась.`,
  );
  process.exit(1);
}

const db = new Database(DB_FILE);
db.pragma("foreign_keys = ON");

const skins = db
  .prepare(`SELECT id, market_name FROM skins ORDER BY id`)
  .all();

if (skins.length === 0) {
  console.error("В базе нет скинов — сначала запустите приложение.");
  process.exit(1);
}

console.log(`Скинов в базе: ${skins.length}`);
console.log(`Загружаем каталог: ${API}`);

let catalogue;
try {
  const res = await fetch(API, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  catalogue = await res.json();
} catch (err) {
  console.error(
    `\nНе удалось получить каталог: ${err.message}\n` +
      "Проверьте доступ в интернет. Сайт продолжит работать на\n" +
      "сгенерированной графике — она используется как запасной вариант.",
  );
  process.exit(1);
}

const list = Array.isArray(catalogue) ? catalogue : Object.values(catalogue);
console.log(`Записей в каталоге: ${list.length}`);

/** Normalises a name so "★ Karambit | Doppler" matches regardless of spacing. */
const normalise = (name) =>
  String(name ?? "")
    .replace(/★/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim()
    .toLowerCase();

const byName = new Map();
for (const entry of list) {
  const image = entry.image;
  if (!image) continue;
  const key = normalise(entry.name);
  if (!byName.has(key)) byName.set(key, image);
}

const upsert = db.transaction((rows) => {
  const clear = db.prepare(`DELETE FROM skin_images WHERE skin_id = ? AND source = 'steam'`);
  const insert = db.prepare(
    `INSERT INTO skin_images (skin_id, url, source, is_primary, created_at)
     VALUES (?, ?, 'steam', 1, ?)`,
  );
  const now = Date.now();
  for (const row of rows) {
    clear.run(row.id);
    insert.run(row.id, row.url, now);
  }
});

const matched = [];
const missing = [];

for (const skin of skins) {
  const url = byName.get(normalise(skin.market_name));
  if (url) matched.push({ id: skin.id, url });
  else missing.push(skin.market_name);
}

upsert(matched);

console.log(`\nНайдено изображений: ${matched.length} из ${skins.length}`);
if (missing.length > 0) {
  console.log(`Не найдено (${missing.length}):`);
  for (const name of missing) console.log(`  · ${name}`);
  console.log(
    "\nДля них останется сгенерированная графика. Проверьте точность\n" +
      "market_name в lib/server/seed-data.ts.",
  );
}
console.log("\nГотово. Обновите страницу, чтобы увидеть реальные изображения.");
