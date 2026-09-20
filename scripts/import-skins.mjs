/**
 * Imports real CS2 artwork for every skin in the catalogue.
 *
 * Source
 * ------
 * ByMykel/CSGO-API — a public, MIT-licensed export of Valve's own item
 * data. Each entry carries the skin's exact market name and the URL of
 * Valve's own render on the Steam CDN, so the picture shown for
 * "AWP | Asiimov" is Valve's Asiimov render, not a generic AWP.
 *
 * The dataset is read from raw.githubusercontent.com rather than the
 * project's GitHub Pages mirror, because raw is reachable from more
 * networks and serves the same file.
 *
 * Usage
 * -----
 *   npm run import:skins                 map names → image URLs
 *   npm run import:skins -- --verify     also HTTP-check every URL
 *   npm run import:skins -- --download   cache the files into public/skins
 *   npm run import:skins -- --force      re-import rows already marked valid
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

const OPTIONS = {
  source: value(
    "--source",
    "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json",
  ),
  file: value("--file", null),
  verify: has("--verify") || has("--download"),
  download: has("--download"),
  force: has("--force"),
  concurrency: Number(value("--concurrency", "8")) || 8,
  timeout: Number(value("--timeout", "25000")) || 25000,
};

const DB_FILE =
  process.env.ZEVORA_DB_FILE ?? path.join(process.cwd(), ".data", "zevora.db");
const PUBLIC_DIR = path.join(process.cwd(), "public", "skins");
const SOURCE_NAME = "bymykel/CSGO-API (Steam CDN)";

/* ───────────────────────── helpers ───────────────────────── */

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Normalises a market name for matching.
 * Valve's ★ prefix and inconsistent spacing around the pipe are the only
 * differences that ever show up between sources.
 */
const normalise = (name) =>
  String(name ?? "")
    .replace(/★/g, "")
    .replace(/\(.*?\)\s*$/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim()
    .toLowerCase();

/** Reads width and height out of a PNG's IHDR chunk. */
function pngSize(buffer) {
  if (buffer.length < 24) return null;
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Runs `worker` over `items` with a bounded number in flight. */
async function pool(items, limit, worker) {
  const results = [];
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/* ───────────────────────── dataset ───────────────────────── */

async function loadDataset() {
  if (OPTIONS.file) {
    console.log(`Источник: локальный файл ${OPTIONS.file}`);
    return JSON.parse(fs.readFileSync(OPTIONS.file, "utf8"));
  }

  console.log(`Источник: ${OPTIONS.source}`);
  const res = await fetch(OPTIONS.source, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке каталога`);
  return res.json();
}

/* ───────────────────────── validation ───────────────────────── */

/**
 * Fetches an image and reports what actually came back.
 * A URL that answers 200 with an HTML error page is not a valid image,
 * so the content type and the PNG header are both checked.
 */
async function inspectImage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(OPTIONS.timeout) });
    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
      return { ok: false, status: res.status, contentType, reason: `HTTP ${res.status}` };
    }
    if (!contentType.startsWith("image/")) {
      return { ok: false, status: res.status, contentType, reason: `не изображение (${contentType})` };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const size = pngSize(buffer);

    if (buffer.length < 1024) {
      return { ok: false, status: res.status, contentType, bytes: buffer.length, reason: "слишком маленький файл" };
    }

    return {
      ok: true,
      status: res.status,
      contentType,
      bytes: buffer.length,
      width: size?.width ?? null,
      height: size?.height ?? null,
      buffer,
    };
  } catch (err) {
    return { ok: false, status: null, reason: err.name === "TimeoutError" ? "таймаут" : err.message };
  }
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

  const db = new Database(DB_FILE);
  db.pragma("foreign_keys = ON");

  const skins = db
    .prepare(
      `SELECT s.id, s.slug, s.market_name, s.market_hash_name,
              s.image_url, s.image_status, r.slug AS rarity_slug
         FROM skins s JOIN rarities r ON r.id = s.rarity_id
        ORDER BY s.id`,
    )
    .all();

  if (skins.length === 0) {
    console.error(c.red("В базе нет скинов — сначала запустите приложение."));
    process.exit(1);
  }

  console.log(`Скинов в каталоге: ${c.bold(skins.length)}`);

  const dataset = await loadDataset();
  const entries = Array.isArray(dataset) ? dataset : Object.values(dataset);
  console.log(`Записей в каталоге источника: ${c.bold(entries.length)}\n`);

  // Build the lookup once. First entry wins, which keeps the base skin
  // rather than a souvenir or StatTrak duplicate.
  const byName = new Map();
  for (const entry of entries) {
    if (!entry?.name || !entry?.image) continue;
    const key = normalise(entry.name);
    if (!byName.has(key)) byName.set(key, entry);
  }

  const rarityIds = new Map(
    db
      .prepare(`SELECT id, slug FROM rarities`)
      .all()
      .map((r) => [r.slug, r.id]),
  );

  /** Valve's rarity names → our rarity slugs. */
  const RARITY_SLUG = {
    "Consumer Grade": "consumer",
    "Industrial Grade": "industrial",
    "Mil-Spec Grade": "milspec",
    Restricted: "restricted",
    Classified: "classified",
    Covert: "covert",
    Extraordinary: "extraordinary",
    Contraband: "contraband",
  };

  // ── match ──
  const matched = [];
  const unmatched = [];

  for (const skin of skins) {
    const hash = skin.market_hash_name ?? skin.market_name;
    const entry = byName.get(normalise(hash));
    if (entry) matched.push({ skin, entry });
    else unmatched.push(skin);
  }

  console.log(
    `Сопоставлено по имени: ${c.green(matched.length)} / ${skins.length}` +
      (unmatched.length ? `, не найдено: ${c.yellow(unmatched.length)}` : ""),
  );

  // Rows already validated are left alone unless --force.
  const work = matched.filter(
    ({ skin }) => OPTIONS.force || skin.image_status !== "valid",
  );
  const skipped = matched.length - work.length;
  if (skipped > 0) console.log(c.dim(`Пропущено уже импортированных: ${skipped}`));

  if (OPTIONS.download) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const now = Date.now();
  const updateSkin = db.prepare(
    `UPDATE skins
        SET market_hash_name = @hash,
            image_url = @url,
            image_source = @source,
            image_status = @status,
            image_checked_at = @checked,
            rarity_id = COALESCE(@rarity_id, rarity_id),
            updated_at = @checked
      WHERE id = @id`,
  );
  const recordImage = db.prepare(
    `INSERT INTO skin_images
       (skin_id, url, source, is_primary, http_status, content_type,
        bytes, width, height, checked_at, created_at)
     VALUES (@skin_id, @url, @source, 1, @http_status, @content_type,
             @bytes, @width, @height, @checked_at, @created_at)
     ON CONFLICT(skin_id, url) DO UPDATE SET
       http_status = excluded.http_status,
       content_type = excluded.content_type,
       bytes = excluded.bytes,
       width = excluded.width,
       height = excluded.height,
       checked_at = excluded.checked_at`,
  );

  const stats = { valid: 0, pending: 0, broken: 0, downloaded: 0 };
  const failures = [];

  if (OPTIONS.verify) {
    console.log(
      `\nПроверяю изображения (параллельно ${OPTIONS.concurrency})…` +
        (OPTIONS.download ? " с сохранением в public/skins" : ""),
    );
  } else {
    console.log(
      c.dim("\nБез --verify URL только записываются; статус останется pending."),
    );
  }

  const results = await pool(work, OPTIONS.concurrency, async ({ skin, entry }) => {
    const rarityName = entry.rarity?.name;
    const raritySlug = RARITY_SLUG[rarityName];
    const rarityId = raritySlug ? (rarityIds.get(raritySlug) ?? null) : null;

    const row = {
      id: skin.id,
      hash: entry.name,
      url: entry.image,
      source: "steam-cdn",
      status: "pending",
      checked: now,
      rarity_id: rarityId,
    };

    if (!OPTIONS.verify) return { skin, entry, row, inspection: null };

    const inspection = await inspectImage(entry.image);

    if (inspection.ok) {
      row.status = "valid";
      if (OPTIONS.download && inspection.buffer) {
        const file = `${skin.slug}.png`;
        fs.writeFileSync(path.join(PUBLIC_DIR, file), inspection.buffer);
        // Serving from our own origin removes the CDN as a dependency.
        row.url = `/skins/${file}`;
        row.source = "local";
        stats.downloaded++;
      }
    } else {
      row.status = "broken";
      failures.push({ name: skin.market_name, reason: inspection.reason });
    }

    return { skin, entry, row, inspection };
  });

  // ── persist ──
  const write = db.transaction((items) => {
    for (const { skin, entry, row, inspection } of items) {
      updateSkin.run(row);
      stats[row.status] = (stats[row.status] ?? 0) + 1;

      recordImage.run({
        skin_id: skin.id,
        url: row.url,
        source: row.source,
        http_status: inspection?.status ?? null,
        content_type: inspection?.contentType ?? null,
        bytes: inspection?.bytes ?? null,
        width: inspection?.width ?? null,
        height: inspection?.height ?? null,
        checked_at: OPTIONS.verify ? now : null,
        created_at: now,
      });

      // The Steam URL stays on record even when a local copy is served.
      if (row.source === "local") {
        recordImage.run({
          skin_id: skin.id,
          url: entry.image,
          source: "steam-cdn",
          http_status: inspection?.status ?? null,
          content_type: inspection?.contentType ?? null,
          bytes: inspection?.bytes ?? null,
          width: inspection?.width ?? null,
          height: inspection?.height ?? null,
          checked_at: now,
          created_at: now,
        });
      }
    }
  });
  write(results);

  // Anything the source does not know about is flagged, not left ambiguous.
  const markMissing = db.prepare(
    `UPDATE skins SET image_status = 'missing', image_checked_at = ? WHERE id = ?`,
  );
  for (const skin of unmatched) markMissing.run(now, skin.id);

  // ── report ──
  console.log(`\n${c.bold("Результат")}`);
  console.log(`  валидных:     ${c.green(stats.valid ?? 0)}`);
  if ((stats.pending ?? 0) > 0) console.log(`  без проверки: ${stats.pending}`);
  if ((stats.broken ?? 0) > 0) console.log(`  битых:        ${c.red(stats.broken)}`);
  if (unmatched.length > 0) console.log(`  не найдено:   ${c.yellow(unmatched.length)}`);
  if (OPTIONS.download) console.log(`  сохранено:    ${stats.downloaded} → public/skins/`);

  if (failures.length > 0) {
    console.log(`\n${c.red("Не удалось загрузить:")}`);
    for (const f of failures.slice(0, 20)) {
      console.log(`  · ${f.name.padEnd(34)} ${f.reason}`);
    }
    if (failures.length > 20) console.log(`  … и ещё ${failures.length - 20}`);
    console.log(
      c.dim(
        "\nЕсли причина — блокировка сети, изображения всё равно записаны\n" +
          "в базу и загрузятся в браузере пользователя. Повторный запуск\n" +
          "перепроверит только эти строки.",
      ),
    );
  }

  if (unmatched.length > 0) {
    console.log(`\n${c.yellow("Нет в источнике:")}`);
    for (const s of unmatched.slice(0, 20)) console.log(`  · ${s.market_name}`);
    console.log(
      c.dim("Проверьте точность market_name в lib/server/seed-data.ts."),
    );
  }

  const summary = db
    .prepare(
      `SELECT image_status AS status, COUNT(*) AS n FROM skins GROUP BY image_status`,
    )
    .all();
  console.log(`\n${c.bold("Состояние каталога")}`);
  for (const r of summary) console.log(`  ${String(r.status).padEnd(9)} ${r.n}`);

  console.log(`\nИсточник записан как: ${c.bold(SOURCE_NAME)}`);
  console.log("Готово.");
}

main().catch((err) => {
  console.error(c.red(`\nОшибка импорта: ${err.message}`));
  process.exit(1);
});
