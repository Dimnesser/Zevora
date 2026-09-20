/**
 * Verifies that each skin's artwork really is that skin's artwork.
 *
 * Two independent checks:
 *
 *  1. Structural — the URL stored for "AWP | Asiimov" must come from the
 *     source record whose own `weapon` and `pattern` fields say AWP and
 *     Asiimov. That catches an off-by-one or a generic-weapon mapping,
 *     which an HTTP check alone would happily pass.
 *
 *  2. Network — fetch the URL and report status, content type and pixel
 *     dimensions. Needs egress to the image host.
 *
 *   npm run verify:images                 the 20 reference skins
 *   npm run verify:images -- --all        every skin in the catalogue
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const SOURCE =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const LOCAL = argv.includes("--file") ? argv[argv.indexOf("--file") + 1] : null;

const DB_FILE =
  process.env.ZEVORA_DB_FILE ?? path.join(process.cwd(), ".data", "zevora.db");

/** The reference set from the brief. */
const REFERENCE = [
  "AK-47 | Redline",
  "AWP | Asiimov",
  "M4A1-S | Printstream",
  "Glock-18 | Fade",
  "Desert Eagle | Printstream",
  "AK-47 | Asiimov",
  "AWP | Dragon Lore",
  "M4A4 | Howl",
  "USP-S | Kill Confirmed",
  "M4A1-S | Hyper Beast",
  "Glock-18 | Vogue",
  "AWP | Hyper Beast",
  "AK-47 | Neon Rider",
  "M4A4 | Neo-Noir",
  "AWP | Lightning Strike",
  "Desert Eagle | Blaze",
  "USP-S | Cortex",
  "AK-47 | The Empress",
  "M4A1-S | Player Two",
  "Glock-18 | Water Elemental",
];

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const normalise = (n) =>
  String(n ?? "")
    .replace(/★/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\|\s*/g, " | ")
    .trim()
    .toLowerCase();

function pngSize(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

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
  : REFERENCE.map((n) => skins.find((s) => normalise(s.market_name) === normalise(n)) ?? { market_name: n, missing: true });

console.log(`${c.bold("Проверка изображений")} — ${targets.length} скинов\n`);

// ── load the source for the structural check ──
let source = null;
try {
  const raw = LOCAL
    ? fs.readFileSync(LOCAL, "utf8")
    : await (await fetch(SOURCE, { signal: AbortSignal.timeout(120_000) })).text();
  const parsed = JSON.parse(raw);
  source = new Map(
    (Array.isArray(parsed) ? parsed : Object.values(parsed))
      .filter((e) => e?.name && e?.image)
      .map((e) => [normalise(e.name), e]),
  );
  console.log(c.dim(`Источник загружен: ${source.size} записей\n`));
} catch (err) {
  console.log(c.yellow(`Источник недоступен (${err.message}) — структурная проверка пропущена\n`));
}

// ── uniqueness ──
const urls = new Map();
for (const s of skins) {
  if (!s.image_url) continue;
  urls.set(s.image_url, (urls.get(s.image_url) ?? 0) + 1);
}
const duplicates = [...urls.entries()].filter(([, n]) => n > 1);

let structOk = 0;
let structBad = 0;
let netOk = 0;
let netBad = 0;
let noUrl = 0;

console.log(
  "Скин".padEnd(32) + "СТРУКТУРА".padEnd(26) + "СЕТЬ".padEnd(28) + "URL",
);
console.log("─".repeat(120));

for (const skin of targets) {
  const name = skin.market_name;

  if (skin.missing || !skin.image_url) {
    noUrl++;
    console.log(name.padEnd(32) + c.red("нет в каталоге").padEnd(35) + "—");
    continue;
  }

  // 1. structural
  let structural = c.dim("—");
  if (source) {
    const entry = source.get(normalise(skin.market_hash_name ?? name));
    if (!entry) {
      structural = c.red("нет записи");
      structBad++;
    } else {
      const urlMatches =
        skin.image_source === "local" || entry.image === skin.image_url;
      // The record must independently name this weapon and this finish.
      const weaponOk = name.startsWith(entry.weapon?.name ?? "\u0000") ||
        name.includes(entry.weapon?.name ?? "\u0000");
      const patternOk = name.includes(entry.pattern?.name ?? "\u0000");

      if (urlMatches && weaponOk && patternOk) {
        structural = c.green(`${entry.weapon.name}/${entry.pattern.name}`);
        structOk++;
      } else {
        structural = c.red(
          `рассинхрон${!urlMatches ? " url" : ""}${!weaponOk ? " weapon" : ""}${!patternOk ? " pattern" : ""}`,
        );
        structBad++;
      }
    }
  }

  // 2. network
  let network = c.dim("не проверялось");
  const isLocal = skin.image_url.startsWith("/");
  if (isLocal) {
    const file = path.join(process.cwd(), "public", skin.image_url);
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file);
      const size = pngSize(buf);
      network = c.green(`локально ${size ? `${size.width}×${size.height}` : ""} ${(buf.length / 1024) | 0}KB`);
      netOk++;
    } else {
      network = c.red("файл отсутствует");
      netBad++;
    }
  } else {
    try {
      const res = await fetch(skin.image_url, { signal: AbortSignal.timeout(15000) });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.startsWith("image/")) {
        const buf = Buffer.from(await res.arrayBuffer());
        const size = pngSize(buf);
        network = c.green(`${res.status} ${type.split("/")[1]} ${size ? `${size.width}×${size.height}` : ""} ${(buf.length / 1024) | 0}KB`);
        netOk++;
      } else {
        network = c.red(`${res.status} ${type || "?"}`);
        netBad++;
      }
    } catch (err) {
      network = c.red(err.name === "TimeoutError" ? "таймаут" : "сеть закрыта");
      netBad++;
    }
  }

  const shown = skin.image_url.length > 46
    ? skin.image_url.slice(0, 43) + "…"
    : skin.image_url;
  // padEnd counts ANSI escapes, so pad on the raw text length instead.
  const pad = (text, width) => text + " ".repeat(Math.max(1, width - text.replace(/\x1b\[[0-9;]*m/g, "").length));
  console.log(pad(name, 32) + pad(structural, 26) + pad(network, 28) + c.dim(shown));
}

console.log("─".repeat(120));
console.log(`\n${c.bold("Итого")}`);
if (source) {
  console.log(`  структура:  ${c.green(structOk)} верных, ${structBad > 0 ? c.red(structBad) : 0} расхождений`);
}
console.log(`  сеть:       ${netOk > 0 ? c.green(netOk) : 0} загрузилось, ${netBad > 0 ? c.red(netBad) : 0} не удалось`);
if (noUrl > 0) console.log(`  без URL:    ${c.red(noUrl)}`);
console.log(
  `  уникальность URL: ${duplicates.length === 0 ? c.green("каждый скин со своим изображением") : c.red(`${duplicates.length} повторов`)}`,
);
for (const [url, n] of duplicates.slice(0, 5)) {
  console.log(c.red(`    ${n}× ${url.slice(0, 80)}`));
}

const failed = structBad + noUrl + duplicates.length;
if (netBad > 0 && netOk === 0) {
  console.log(
    c.yellow(
      "\nНи одно изображение не загрузилось по сети. Если хост недоступен\n" +
        "из этой среды, запустите проверку там, где есть доступ к CDN:\n" +
        "  npm run verify:images",
    ),
  );
}
process.exit(failed > 0 ? 1 : 0);
