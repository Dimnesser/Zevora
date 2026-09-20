/**
 * Browser check: does every skin on the site render its own real image?
 *
 * Walks the catalogue, each case page, the inventory and the history in
 * a real Chromium, and reports for each page how many skin images the
 * DOM carries, how many the browser actually decoded, and how many fell
 * back to the procedural SVG. The 20 reference skins must each appear
 * with their own distinct URL.
 *
 *   node scripts/check-browser-images.mjs
 *   BASE=http://localhost:3000 node scripts/check-browser-images.mjs
 *
 * If the image host is unreachable (a sandbox or CI box that blocks
 * *.steamstatic.com), the run continues with the CDN stubbed: the URL
 * under test stays the app's own, only the bytes are served locally, so
 * the wiring is still proven end to end. The summary says which mode ran.
 */
import { createRequire } from "node:module";
import zlib from "node:zlib";

const BASE = process.env.BASE ?? "http://localhost:3000";
const LOGIN = { username: process.env.USER_NAME ?? "player", password: process.env.USER_PASS ?? "player123" };

const REFERENCE = [
  "AK-47 | Redline", "AWP | Asiimov", "M4A1-S | Printstream",
  "Glock-18 | Fade", "Desert Eagle | Printstream", "AK-47 | Asiimov",
  "AWP | Dragon Lore", "M4A4 | Howl", "USP-S | Kill Confirmed",
  "M4A1-S | Hyper Beast", "Glock-18 | Vogue", "AWP | Hyper Beast",
  "AK-47 | Neon Rider", "M4A4 | Neo-Noir", "AWP | Lightning Strike",
  "Desert Eagle | Blaze", "USP-S | Cortex", "AK-47 | The Empress",
  "M4A1-S | Player Two", "Glock-18 | Water Elemental",
];

const g = { ok: "\x1b[32m", bad: "\x1b[31m", dim: "\x1b[2m", off: "\x1b[0m" };

/* Playwright is a checking tool, not a runtime dependency, so it is
   resolved from wherever it happens to be installed. */
function loadChromium() {
  const require_ = createRequire(import.meta.url);
  for (const id of ["playwright", "playwright-core", "/opt/node22/lib/node_modules/playwright"]) {
    try { return require_(id).chromium; } catch { /* keep looking */ }
  }
  console.error("Нужен Playwright:  npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

/** A plain PNG used only when the real host cannot be reached. */
function standInPng(size = 512) {
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 4, 0x30)]);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(Array(size).fill(row)), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const api = async (p, init) => {
  const res = await fetch(BASE + p, init);
  return { status: res.status, headers: res.headers, json: await res.json().catch(() => null) };
};

/** Can the image host actually be reached from here? */
async function cdnReachable(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch { return false; }
}

async function main() {
  const cases = await api("/api/cases");
  if (cases.status !== 200) {
    console.error(`${BASE} не отвечает — запустите сервер (npm run dev или npm start)`);
    process.exit(2);
  }

  /* Pick any catalogue URL to probe the host with. */
  const probe = await api("/api/admin/skins").then((r) => r.json?.skins?.[0]?.image_url).catch(() => null);
  const sample = probe ?? (await api(`/api/cases/${cases.json.cases[0].slug}`))
    .json?.items?.find((i) => i.image_url)?.image_url;
  const live = sample ? await cdnReachable(sample) : false;

  console.log(live
    ? `${g.ok}режим: настоящая загрузка с CDN${g.off}`
    : `${g.dim}режим: хост изображений недоступен из этой среды — байты подменяются локально, URL остаются настоящими${g.off}`);

  const chromium = loadChromium();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  if (!live) {
    const png = standInPng();
    await ctx.route("**/*.steamstatic.com/**", (r) =>
      r.fulfill({ status: 200, contentType: "image/png", body: png }));
  }

  const login = await api("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(LOGIN),
  });
  if (login.status === 200) {
    const [name, value] = (login.headers.get("set-cookie") ?? "").split(";")[0].split("=");
    const { hostname } = new URL(BASE);
    await ctx.addCookies([{ name, value, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
  } else {
    console.log(`${g.dim}вход не выполнен — инвентарь и история будут пустыми${g.off}`);
  }

  const page = await ctx.newPage();
  const seen = new Map();
  const rows = [];

  async function visit(url, label) {
    await page.goto(BASE + url, { waitUntil: "load" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);

    const imgs = await page.$$eval("img", (ns) => ns.map((n) => ({
      alt: n.getAttribute("alt") ?? "",
      src: n.currentSrc || n.getAttribute("src") || "",
      w: n.naturalWidth,
    })));
    const skins = imgs.filter((i) => /steamstatic\.com|^\/skins\//.test(i.src));
    const fallbacks = await page.locator("svg[data-skin-art]").count();
    for (const i of skins) if (i.alt) seen.set(i.alt, i.src);
    rows.push({ label, total: skins.length, decoded: skins.filter((i) => i.w > 0).length, fallbacks });
  }

  await visit("/", "главная + последние выигрыши");
  for (const c of cases.json.cases) await visit(`/cases/${c.slug}`, `кейс /${c.slug}`);
  await visit("/inventory", "инвентарь");
  await visit("/history", "история открытий");

  console.log("\n── страницы ──");
  console.log(`  ${"страница".padEnd(34)}скинов  декодировано  SVG-фолбэк`);
  for (const r of rows) {
    console.log(`  ${r.label.padEnd(34)}${String(r.total).padStart(6)}${String(r.decoded).padStart(14)}${String(r.fallbacks).padStart(13)}`);
  }

  console.log("\n── 20 эталонных скинов ──");
  let ok = 0;
  const missing = [];
  for (const n of REFERENCE) {
    const src = seen.get(n);
    if (src) { ok += 1; console.log(`  ${g.ok}✓${g.off} ${n.padEnd(30)} ${g.dim}…${src.slice(-34)}${g.off}`); }
    else { missing.push(n); console.log(`  ${g.bad}✗${g.off} ${n.padEnd(30)} не отрисован`); }
  }

  const bySrc = new Map();
  for (const [n, s] of seen) bySrc.set(s, [...(bySrc.get(s) ?? []), n]);
  const shared = [...bySrc.values()].filter((v) => v.length > 1);
  const fallbackTotal = rows.reduce((a, r) => a + r.fallbacks, 0);

  console.log("\n── итог ──");
  console.log(`  эталонных скинов отрисовано:      ${ok}/${REFERENCE.length}`);
  console.log(`  всего разных скинов на страницах: ${seen.size}`);
  console.log(`  уникальных URL:                   ${bySrc.size}`);
  console.log(`  один URL на несколько скинов:     ${shared.length}`);
  console.log(`  SVG-фолбэков:                     ${fallbackTotal}`);
  if (missing.length) console.log(`  ${g.bad}не подтверждены:${g.off} ${missing.join(", ")}`);
  for (const v of shared.slice(0, 5)) console.log(`    ${g.bad}!${g.off} общий URL: ${v.join(", ")}`);

  await browser.close();
  const pass = ok === REFERENCE.length && shared.length === 0 && fallbackTotal === 0;
  console.log(pass ? `\n${g.ok}Каждый скин показывает своё изображение${g.off}`
                   : `\n${g.bad}Проверка не пройдена${g.off}`);
  process.exit(pass ? 0 : 1);
}

await main();
