/**
 * Imports real CS2 artwork for every skin in the catalogue.
 *
 * Where the pictures come from
 * ----------------------------
 * Valve ships a render of every finish inside the game client, under
 * `panorama/images/econ/default_generated/`. Those files are what the
 * game itself draws in the inventory and the buy menu, so the picture
 * for "AWP | Asiimov" is Valve's Asiimov render — not a generic AWP,
 * not an icon, not a drawing.
 *
 * Two public sources are combined:
 *
 *   menschma1er/cs2-images  the extracted `panorama/` tree (5 481 renders
 *                           in default_generated), decompiled with
 *                           ValveResourceFormat and served over
 *                           raw.githubusercontent.com.
 *   ByMykel/CSGO-API        the item dataset, which gives each skin its
 *                           market name plus Valve's internal ids.
 *
 * The join between them is exact, not fuzzy. A render's filename is
 * built from Valve's own identifiers:
 *
 *   {weapon.id}_{pattern.id}_{wear}.png
 *   weapon_ak47 + cu_ak47_cobra + light → weapon_ak47_cu_ak47_cobra_light.png
 *
 * `pattern.id` is the paint-kit name, so a skin can only ever resolve to
 * its own finish. If the file is not in the tree the row is marked
 * `missing` rather than being pointed at something that merely looks
 * close.
 *
 * `light` / `medium` / `heavy` are wear levels (Factory New through
 * Battle-Scarred). The catalogue uses `light`, the crispest one.
 *
 * Usage
 * -----
 *   npm run import:skins                 verify, download, convert to WebP
 *   npm run import:skins -- --no-download  keep CDN URLs, do not write files
 *   npm run import:skins -- --force      re-import rows already marked valid
 *   npm run import:skins -- --wear heavy use a different wear render
 *   npm run import:skins -- --png        skip WebP conversion
 *   npm run import:skins -- --file x.json  use a local copy of the dataset
 *
 * Re-running is safe: rows already marked `valid` are skipped unless
 * --force is given, and rows marked `broken` are always retried.
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/* ───────────────────────── options ───────────────────────── */

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DATASET =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const RENDERS =
  "https://raw.githubusercontent.com/menschma1er/cs2-images/main/panorama/images/econ/default_generated";

const OPTIONS = {
  source: value("--source", DATASET),
  renders: value("--renders", RENDERS),
  file: value("--file", null),
  wear: value("--wear", "light"),
  download: !has("--no-download"),
  webp: !has("--png"),
  force: has("--force"),
  concurrency: Number(value("--concurrency", "8")) || 8,
  timeout: Number(value("--timeout", "30000")) || 30000,
};

const DB_FILE =
  process.env.ZEVORA_DB_FILE ?? path.join(process.cwd(), ".data", "zevora.db");
const PUBLIC_DIR = path.join(process.cwd(), "public", "skins");
const SOURCE_NAME = "menschma1er/cs2-images · default_generated";

/* ───────────────────────── helpers ───────────────────────── */

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/** Market names differ only in decoration, never in substance. */
const normalise = (name) =>
  String(name ?? "")
    .replace(/★/g, "")
    .replace(/\(.*?\)\s*$/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim()
    .toLowerCase();

/** Width and height straight out of a PNG's IHDR chunk. */
function pngSize(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function fetchBuffer(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OPTIONS.timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok) return { ok: false, status: res.status, type };
    const body = Buffer.from(await res.arrayBuffer());
    return { ok: true, status: res.status, type, body };
  } catch (err) {
    return { ok: false, status: 0, type: "", error: String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches a render and proves it really is an image before it is used:
 * HTTP status, content type, a plausible size, and PNG dimensions.
 */
async function fetchRender(url) {
  const res = await fetchBuffer(url);
  if (!res.ok) return { ok: false, status: res.status, type: res.type, error: res.error };

  const size = pngSize(res.body);
  const problem =
    !res.type.startsWith("image/") ? `content-type ${res.type || "—"}`
    : res.body.length < 1024 ? `слишком мало байт (${res.body.length})`
    : !size ? "не PNG"
    : size.width < 64 || size.height < 64 ? `слишком мелко (${size.width}×${size.height})`
    : null;

  if (problem) return { ok: false, status: res.status, type: res.type, error: problem };
  return { ok: true, status: res.status, type: res.type, body: res.body, ...size };
}

/** sharp ships with Next, but the importer must not hard-fail without it. */
async function loadSharp() {
  if (!OPTIONS.webp) return null;
  try {
    return (await import("sharp")).default;
  } catch {
    console.log(c.yellow("sharp недоступен — сохраняю PNG без конвертации в WebP\n"));
    return null;
  }
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await worker(items[i], i);
      }
    }),
  );
  return out;
}

/* ───────────────────────── main ───────────────────────── */

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(
      c.red(`База не найдена: ${DB_FILE}\n`) +
        "Запустите приложение один раз (npm run dev), чтобы она создалась.",
    );
    process.exit(1);
  }

  console.log(c.bold("Импорт изображений скинов"));
  console.log(c.dim(`  данные:   ${OPTIONS.file ?? OPTIONS.source}`));
  console.log(c.dim(`  рендеры:  ${OPTIONS.renders}`));
  console.log(c.dim(`  износ:    ${OPTIONS.wear}`));
  console.log(
    c.dim(
      `  режим:    ${OPTIONS.download ? "скачивание в public/skins" : "только CDN-ссылки"}`,
    ),
  );
  console.log();

  /* ── dataset ── */
  let dataset;
  if (OPTIONS.file) {
    dataset = JSON.parse(fs.readFileSync(OPTIONS.file, "utf8"));
  } else {
    const res = await fetchBuffer(OPTIONS.source);
    if (!res.ok) {
      console.error(c.red(`Не удалось получить датасет: ${res.status} ${res.error ?? ""}`));
      process.exit(1);
    }
    dataset = JSON.parse(res.body.toString("utf8"));
  }
  const index = new Map();
  for (const entry of dataset) index.set(normalise(entry.name), entry);
  console.log(c.dim(`  записей в датасете: ${dataset.length}\n`));

  const sharp = await loadSharp();
  const db = new Database(DB_FILE);
  db.pragma("foreign_keys = ON");

  const skins = db
    .prepare(
      `SELECT id, slug, market_name, market_hash_name, image_url, image_status
         FROM skins ORDER BY market_name`,
    )
    .all();

  const updateSkin = db.prepare(
    `UPDATE skins
        SET market_hash_name = @hash,
            image_url        = @url,
            image_source     = @source,
            image_status     = @status,
            image_checked_at = @ts,
            updated_at       = @ts
      WHERE id = @id`,
  );
  const journal = db.prepare(
    `INSERT INTO skin_images
       (skin_id, url, source, is_primary, http_status, content_type, bytes,
        width, height, checked_at, created_at)
     VALUES (@skin_id, @url, @source, @primary, @status, @type, @bytes,
             @width, @height, @ts, @ts)
     ON CONFLICT(skin_id, url) DO UPDATE SET
       http_status  = excluded.http_status,
       content_type = excluded.content_type,
       bytes        = excluded.bytes,
       width        = excluded.width,
       height       = excluded.height,
       checked_at   = excluded.checked_at`,
  );

  if (OPTIONS.download) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const tally = { valid: 0, missing: 0, broken: 0, skipped: 0 };

  const results = await mapLimit(skins, OPTIONS.concurrency, async (skin) => {
    /* Already imported and still good — leave it alone. */
    if (!OPTIONS.force && skin.image_status === "valid" && skin.image_url) {
      tally.skipped += 1;
      return { skin, state: "skipped" };
    }

    const entry = index.get(normalise(skin.market_name));
    const weapon = entry?.weapon?.id;
    const pattern = entry?.pattern?.id;

    /* No exact identifiers means no picture — never a lookalike. */
    if (!weapon || !pattern) {
      tally.missing += 1;
      updateSkin.run({
        id: skin.id,
        hash: entry?.name ?? skin.market_hash_name ?? skin.market_name,
        url: null,
        source: null,
        status: "missing",
        ts: Math.floor(Date.now() / 1000),
      });
      return { skin, state: "missing", why: entry ? "нет weapon/pattern id" : "нет в датасете" };
    }

    const file = `${weapon}_${pattern}_${OPTIONS.wear}.png`;
    const url = `${OPTIONS.renders}/${file}`;
    const res = await fetchRender(url);
    const ts = Math.floor(Date.now() / 1000);

    if (!res.ok) {
      tally.broken += 1;
      updateSkin.run({
        id: skin.id,
        hash: entry.name,
        url: null,
        source: null,
        status: res.status === 404 ? "missing" : "broken",
        ts,
      });
      journal.run({
        skin_id: skin.id, url, source: "cdn", primary: 0,
        status: res.status, type: res.type || null, bytes: null,
        width: null, height: null, ts,
      });
      return { skin, state: "broken", why: res.error ?? `HTTP ${res.status}`, url };
    }

    let publicUrl = url;
    let source = "cdn";
    let bytes = res.body.length;

    if (OPTIONS.download) {
      const ext = sharp ? "webp" : "png";
      const out = path.join(PUBLIC_DIR, `${skin.slug}.${ext}`);
      const body = sharp
        ? await sharp(res.body).webp({ quality: 90 }).toBuffer()
        : res.body;
      fs.writeFileSync(out, body);
      bytes = body.length;
      publicUrl = `/skins/${skin.slug}.${ext}`;
      source = "local";
    }

    updateSkin.run({
      id: skin.id,
      hash: entry.name,
      url: publicUrl,
      source,
      status: "valid",
      ts,
    });
    /* The journal always records where the bytes actually came from. */
    journal.run({
      skin_id: skin.id, url, source: "cdn", primary: OPTIONS.download ? 0 : 1,
      status: res.status, type: res.type, bytes: res.body.length,
      width: res.width, height: res.height, ts,
    });
    if (OPTIONS.download) {
      journal.run({
        skin_id: skin.id, url: publicUrl, source: "local", primary: 1,
        status: 200, type: sharp ? "image/webp" : "image/png", bytes,
        width: res.width, height: res.height, ts,
      });
    }

    tally.valid += 1;
    return { skin, state: "valid", url, publicUrl, bytes, w: res.width, h: res.height };
  });

  /* ── report ── */
  for (const r of results) {
    if (r.state === "skipped") continue;
    const mark =
      r.state === "valid" ? c.green("✓")
      : r.state === "missing" ? c.yellow("○")
      : c.red("✗");
    const detail =
      r.state === "valid"
        ? c.dim(`${r.w}×${r.h}  ${(r.bytes / 1024).toFixed(0)} КБ  ${r.publicUrl}`)
        : c.dim(r.why);
    console.log(`  ${mark} ${r.skin.market_name.padEnd(34)} ${detail}`);
  }

  console.log();
  console.log(c.bold("Итого"));
  console.log(`  ${c.green("valid")}    ${tally.valid}`);
  if (tally.skipped) console.log(`  ${c.dim("пропущено")} ${tally.skipped} (уже импортированы, --force чтобы обновить)`);
  if (tally.missing) console.log(`  ${c.yellow("missing")}  ${tally.missing}`);
  if (tally.broken) console.log(`  ${c.red("broken")}   ${tally.broken}`);

  db.close();
  process.exit(tally.broken > 0 ? 1 : 0);
}

await main();
