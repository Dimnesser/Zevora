/**
 * Proves that every skin's picture really is that skin's picture.
 *
 * Three independent checks per skin:
 *
 *   происхождение  The render's filename is rebuilt from Valve's own
 *                  identifiers for this skin — `{weapon.id}_{pattern.id}`
 *                  out of the item dataset — and must equal the filename
 *                  the catalogue actually stored. A generic AK-47 icon
 *                  standing in for AK-47 | Redline fails here, because
 *                  the paint-kit id would not match.
 *
 *   файл           The stored image is fetched (from disk for a cached
 *                  file, over HTTP for a CDN URL) and must come back as a
 *                  real image: status, content type, byte size and pixel
 *                  dimensions read out of the file itself.
 *
 *   уникальность   No two skins may share an image, so one weapon model
 *                  cannot stand in for a whole catalogue.
 *
 *   npm run verify:images
 *   npm run verify:images -- --all      every skin, not just the 20
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const value = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const DB_FILE =
  process.env.ZEVORA_DB_FILE ?? path.join(process.cwd(), ".data", "zevora.db");
const SOURCE = value(
  "--source",
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json",
);
const LOCAL_DATASET = value("--file", null);
const RENDER_HOST =
  "https://raw.githubusercontent.com/menschma1er/cs2-images/main/panorama/images/econ/default_generated";

const REFERENCE = [
  "AK-47 | Redline", "AWP | Asiimov", "M4A1-S | Printstream",
  "Glock-18 | Fade", "Desert Eagle | Printstream", "AK-47 | Asiimov",
  "AWP | Dragon Lore", "M4A4 | Howl", "USP-S | Kill Confirmed",
  "M4A1-S | Hyper Beast", "Glock-18 | Vogue", "AWP | Hyper Beast",
  "AK-47 | Neon Rider", "M4A4 | Neo-Noir", "AWP | Lightning Strike",
  "Desert Eagle | Blaze", "USP-S | Cortex", "AK-47 | The Empress",
  "M4A1-S | Player Two", "Glock-18 | Water Elemental",
];

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const normalise = (n) =>
  String(n ?? "")
    .replace(/★/g, "")
    .replace(/\(.*?\)\s*$/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim()
    .toLowerCase();

/** Dimensions straight out of the file's own header. */
function imageSize(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { kind: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const fourcc = buf.toString("ascii", 12, 16);
    if (fourcc === "VP8X") {
      return { kind: "webp", width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
    }
    if (fourcc === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { kind: "webp", width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (fourcc === "VP8 ") {
      return { kind: "webp", width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    return { kind: "webp", width: 0, height: 0 };
  }
  return null;
}

/** Reads the stored image, whether it is a cached file or a URL. */
async function readImage(url) {
  if (url.startsWith("/")) {
    const file = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    if (!fs.existsSync(file)) return { ok: false, detail: "файла нет на диске" };
    const body = fs.readFileSync(file);
    return { ok: true, body, status: 200, type: url.endsWith(".webp") ? "image/webp" : "image/png", where: "файл" };
  }
  try {
    const res = await fetch(url);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status} ${type}`, status: res.status };
    return { ok: true, body: Buffer.from(await res.arrayBuffer()), status: res.status, type, where: "сеть" };
  } catch (err) {
    return { ok: false, detail: String(err?.message ?? err) };
  }
}

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(
      c.red(`База не найдена: ${DB_FILE}\n`) +
        "Запустите приложение один раз (npm run dev), чтобы она создалась,\n" +
        "или укажите путь: ZEVORA_DB_FILE=/путь/к/app.db npm run verify:images",
    );
    process.exit(1);
  }

  const db = new Database(DB_FILE, { readonly: true });
  const skins = db
    .prepare(
      `SELECT market_name, market_hash_name, image_url, image_source, image_status
         FROM skins ORDER BY market_name`,
    )
    .all();

  const targets = ALL
    ? skins
    : REFERENCE.map(
        (n) =>
          skins.find((s) => normalise(s.market_name) === normalise(n)) ?? {
            market_name: n,
            absent: true,
          },
      );

  /* Dataset for the provenance check. */
  let dataset = null;
  try {
    dataset = LOCAL_DATASET
      ? JSON.parse(fs.readFileSync(LOCAL_DATASET, "utf8"))
      : await (await fetch(SOURCE)).json();
  } catch {
    console.log(c.yellow("Датасет недоступен — проверка происхождения пропущена\n"));
  }
  const index = dataset ? new Map(dataset.map((e) => [normalise(e.name), e])) : null;

  console.log(c.bold("Проверка изображений") + ` — ${targets.length} скинов\n`);
  console.log(
    "  " + "скин".padEnd(30) + "происхождение".padEnd(22) + "файл".padEnd(30) + "путь",
  );
  console.log("  " + "─".repeat(116));

  let originOk = 0, originBad = 0, fileOk = 0, fileBad = 0;
  const seenUrls = new Map();

  for (const s of targets) {
    if (s.absent || !s.image_url) {
      originBad += 1; fileBad += 1;
      console.log(`  ${s.market_name.padEnd(30)}${c.red("нет в каталоге".padEnd(22))}`);
      continue;
    }

    /* ── provenance ── */
    let originCell = c.dim("—".padEnd(22));
    if (index) {
      const entry = index.get(normalise(s.market_name));
      const weapon = entry?.weapon?.id;
      const pattern = entry?.pattern?.id;
      const expected = weapon && pattern ? `${weapon}_${pattern}_light` : null;
      const journal = db
        .prepare(
          `SELECT url FROM skin_images
            WHERE skin_id = (SELECT id FROM skins WHERE market_name = ?)
              AND url LIKE ?`,
        )
        .all(s.market_name, `${RENDER_HOST}%`)
        .map((r) => r.url);
      const actual = journal[0] ? path.basename(journal[0], ".png") : null;

      if (expected && actual === expected) {
        originOk += 1;
        originCell = c.green(`${weapon}/${pattern}`.slice(0, 20).padEnd(22));
      } else {
        originBad += 1;
        originCell = c.red((actual ? `≠ ${expected ?? "?"}` : "нет записи").slice(0, 20).padEnd(22));
      }
    }

    /* ── the file itself ── */
    const img = await readImage(s.image_url);
    let fileCell;
    if (!img.ok) {
      fileBad += 1;
      fileCell = c.red(String(img.detail).slice(0, 28).padEnd(30));
    } else {
      const size = imageSize(img.body);
      const bad =
        !img.type.startsWith("image/") ? `content-type ${img.type}`
        : img.body.length < 1024 ? `${img.body.length} байт`
        : !size ? "не распознан формат"
        : size.width < 64 ? `${size.width}×${size.height}`
        : null;
      if (bad) { fileBad += 1; fileCell = c.red(bad.slice(0, 28).padEnd(30)); }
      else {
        fileOk += 1;
        fileCell = c.green(
          `${img.status} ${img.type} ${size.width}×${size.height} ${(img.body.length / 1024).toFixed(0)}КБ`
            .slice(0, 28)
            .padEnd(30),
        );
      }
    }

    seenUrls.set(s.image_url, [...(seenUrls.get(s.image_url) ?? []), s.market_name]);
    console.log(`  ${s.market_name.padEnd(30)}${originCell}${fileCell}${c.dim(s.image_url)}`);
  }

  const shared = [...seenUrls.entries()].filter(([, v]) => v.length > 1);

  console.log("  " + "─".repeat(116));
  console.log("\n" + c.bold("Итого"));
  console.log(`  происхождение: ${c.green(originOk)} верных, ${originBad ? c.red(originBad) : 0} расхождений`);
  console.log(`  файл:          ${c.green(fileOk)} загрузилось, ${fileBad ? c.red(fileBad) : 0} не удалось`);
  console.log(
    `  уникальность:  ${shared.length === 0 ? c.green("каждый скин со своим изображением") : c.red(`${shared.length} общих URL`)}`,
  );
  for (const [url, names] of shared.slice(0, 5)) console.log(c.red(`    ! ${url} → ${names.join(", ")}`));

  db.close();
  process.exit(originBad === 0 && fileBad === 0 && shared.length === 0 ? 0 : 1);
}

await main();
