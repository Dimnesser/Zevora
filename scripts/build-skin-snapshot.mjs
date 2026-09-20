/**
 * Rebuilds lib/server/skin-images.json from the imported catalogue.
 *
 * The snapshot is what makes a fresh clone show real artwork before
 * anyone runs the importer: the seed reads it to fill `image_url`,
 * `image_source`, the Valve rarity and the float range.
 *
 * Images come from the database (so the snapshot records what was
 * actually imported and verified), while rarity and float range come
 * from the dataset (so they stay Valve's values rather than a copy of a
 * copy).
 *
 *   node scripts/build-skin-snapshot.mjs
 *   ZEVORA_DB_FILE=/path/app.db node scripts/build-skin-snapshot.mjs
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATASET =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DB_FILE =
  process.env.ZEVORA_DB_FILE ?? path.join(process.cwd(), ".data", "zevora.db");
const OUT = path.join(process.cwd(), "lib", "server", "skin-images.json");
const SOURCE = value("--source", DATASET);
const FILE = value("--file", null);

const normalise = (n) =>
  String(n ?? "")
    .replace(/★/g, "")
    .replace(/\(.*?\)\s*$/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim()
    .toLowerCase();

/** Valve's rarity names, mapped onto the slugs the seed uses. */
const RARITY = {
  "Consumer Grade": "consumer",
  "Industrial Grade": "industrial",
  "Mil-Spec Grade": "milspec",
  Restricted: "restricted",
  Classified: "classified",
  Covert: "covert",
  Contraband: "contraband",
  Extraordinary: "extraordinary",
};

const dataset = FILE
  ? JSON.parse(fs.readFileSync(FILE, "utf8"))
  : await (await fetch(SOURCE)).json();

const index = new Map(dataset.map((e) => [normalise(e.name), e]));

const db = new Database(DB_FILE, { readonly: true });
const skins = db
  .prepare(
    `SELECT slug, market_name, market_hash_name, image_url, image_source
       FROM skins ORDER BY market_name`,
  )
  .all();

const out = {};
let withImage = 0;
const missing = [];

for (const s of skins) {
  const entry = index.get(normalise(s.market_name));
  if (!s.image_url) {
    missing.push(s.market_name);
    continue;
  }
  const weapon = entry?.weapon?.id;
  const pattern = entry?.pattern?.id;
  out[s.market_name] = {
    market_hash_name: s.market_hash_name ?? entry?.name ?? s.market_name,
    image: s.image_url,
    source: s.image_source ?? "cdn",
    origin:
      weapon && pattern
        ? `https://raw.githubusercontent.com/menschma1er/cs2-images/main/panorama/images/econ/default_generated/${weapon}_${pattern}_light.png`
        : null,
    rarity: RARITY[entry?.rarity?.name] ?? null,
    min_float: entry?.min_float ?? 0,
    max_float: entry?.max_float ?? 1,
  };
  withImage += 1;
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`Записано ${withImage} скинов в ${path.relative(process.cwd(), OUT)}`);
if (missing.length) {
  console.log(`Без изображения (${missing.length}): ${missing.join(", ")}`);
  process.exit(1);
}
db.close();
