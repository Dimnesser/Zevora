/**
 * Builds the static showcase published to GitHub Pages.
 *
 * Zevora itself cannot run on Pages: the case system is deliberately
 * server-authoritative — SQLite, sessions, transactional balance, a
 * CSPRNG draw behind an API — and Pages serves static files only. So what
 * ships there is the part that *is* static: the 25 case designs, their
 * real drop tables, and the opening animation, all rendered from the same
 * artwork and the same `cases.json` the app uses.
 *
 * The page says plainly that the roll is client-side and for show. The
 * real product still needs a Node host.
 *
 *   npm run build:showcase     → docs/
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs");
const CASES = JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "server", "cases.json"), "utf8"));
const IMAGES = JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "server", "skin-images.json"), "utf8"));

/** Skin catalogue, read from the seed source so prices stay in one place. */
function readSkins() {
  const src = fs.readFileSync(path.join(ROOT, "lib", "server", "seed-data.ts"), "utf8");
  const re = /\{ slug: "([a-z0-9-]+)", market_name: "([^"]+)", weapon: "([^"]+)", finish: "([^"]+)", rarity: "([a-z]+)", price: (\d+)/g;
  const out = {};
  let m;
  while ((m = re.exec(src))) {
    out[m[1]] = { slug: m[1], name: m[2], weapon: m[3], finish: m[4], rarity: m[5], price: Number(m[6]) };
  }
  return out;
}

const RARITY = {
  consumer: "#b0c3d9", industrial: "#5e98d9", milspec: "#4b69ff", restricted: "#8847ff",
  classified: "#d32ce6", covert: "#eb4b4b", extraordinary: "#caab05", contraband: "#e4ae39",
};

const money = (v) => `${v.toLocaleString("ru-RU")} ₽`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function main() {
  const skins = readSkins();

  // Everything the page needs, resolved at build time.
  const data = CASES.map((c) => {
    const total = Object.values(c.items).reduce((a, b) => a + b, 0);
    const items = Object.entries(c.items)
      .map(([slug, w]) => {
        const s = skins[slug];
        if (!s) return null;
        return {
          name: s.name, price: s.price, rarity: s.rarity, weight: w,
          chance: w / total,
          // The catalogue stores site-absolute paths ("/skins/..."), but
          // Pages serves this under /<repo>/, where a leading slash would
          // resolve to the domain root and 404. Everything here is
          // relative to index.html.
          image: (IMAGES[s.name]?.image ?? "").replace(/^\//, "") || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.price - a.price);
    const ev = items.reduce((a, it) => a + it.chance * it.price, 0);
    return {
      slug: c.slug, name: c.name, description: c.description, price: c.price,
      partner: c.partner_only, shell: c.shell, tags: c.tags,
      ev: Math.round(ev), margin: c.price ? 1 - ev / c.price : null,
      items,
    };
  });

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, "cases"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "skins"), { recursive: true });

  for (const f of fs.readdirSync(path.join(ROOT, "public", "cases"))) {
    fs.copyFileSync(path.join(ROOT, "public", "cases", f), path.join(OUT, "cases", f));
  }
  const needed = new Set(data.flatMap((c) => c.items.map((i) => i.image).filter(Boolean)));
  const missing = [];
  for (const url of needed) {
    const file = path.basename(url);
    const src = path.join(ROOT, "public", "skins", file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, "skins", file));
    else missing.push(file);
  }
  // A page that ships broken image icons is worse than one that fails to
  // build, so an unresolved render stops the build rather than reaching Pages.
  if (missing.length) {
    console.error(`Нет файлов рендеров (${missing.length}): ${missing.slice(0, 5).join(", ")}`);
    console.error("Запустите npm run import:skins");
    process.exit(1);
  }
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

  const cards = data.map((c) => `
    <button class="card" data-slug="${esc(c.slug)}" type="button">
      <div class="art"><img src="cases/${esc(c.slug)}.webp" alt="Кейс ${esc(c.name)}" loading="lazy" width="640" height="480"></div>
      <div class="meta-block">
        <div class="row"><span class="nm">${esc(c.name)}</span>${c.partner ? '<span class="tag">Партнёр</span>' : ""}</div>
        <div class="row"><span class="meta">${c.items.length} предм.</span><span class="meta tnum">до ${money(c.items[0].price)}</span></div>
        <div class="rail"><span class="meta">Открыть</span><span class="price tnum">${c.price ? money(c.price) : "Бесплатно"}</span></div>
      </div>
    </button>`).join("");

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zevora — Кейсы</title>
<meta name="description" content="25 кейсов Zevora: дизайн, дроп-таблицы и анимация открывания.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%235B4BFF'/><path d='M10 9h12l-8 7h8l-12 8 5-8h-5z' fill='%23fff'/></svg>">
<style>
:root{
  --cell:128px;--gap:10px;
  --void:#06070B;--ink:#0A0C12;--slab:#0F121A;--panel:#141824;--raised:#1A1F2E;
  --line:#232937;--line-soft:#1A1F2B;
  --zev:#5B4BFF;--zev-400:#7075FF;--ice:#5AE4FF;--gold:#F5B841;--gold-300:#FFDD8A;
  --text:#E8ECF6;--muted:#8B95AE;--dim:#5C6679;
}
*{box-sizing:border-box}
body{margin:0;background:var(--void);color:var(--text);
  font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  -webkit-font-smoothing:antialiased;position:relative;min-height:100vh;overflow-x:hidden}

/* Depth, in the same three fixed layers the app uses: light pools, then
   generated grain plus an edge vignette. The grain is load-bearing — at
   this opacity it kills the banding large dark gradients otherwise show. */
body::before,body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:0}
body::before{background:
  radial-gradient(780px 520px at 8% -6%,rgba(91,75,255,.16),transparent 62%),
  radial-gradient(620px 460px at 94% 2%,rgba(34,211,238,.09),transparent 58%),
  radial-gradient(900px 700px at 50% 108%,rgba(91,75,255,.08),transparent 62%),
  linear-gradient(180deg,#0a0c12 0%,#06070b 58%,#05060a 100%)}
body::after{background-image:
  radial-gradient(ellipse 120% 80% at 50% 50%,transparent 42%,rgba(0,0,0,.55) 100%),
  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.38'/%3E%3C/svg%3E");
  background-size:100% 100%,160px 160px;opacity:.55;mix-blend-mode:overlay}
body>*{position:relative;z-index:1}
a{color:inherit}
::selection{background:rgba(91,75,255,.4);color:#fff}

/* Small-caps technical label — the texture that makes a game UI feel built */
.meta{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--dim);line-height:1.2}
.tnum{font-variant-numeric:tabular-nums}

.wrap{max-width:1240px;margin:0 auto;padding:0 16px 72px}
header{padding:22px 0 8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.22em;font-size:14px}
.logo i{width:24px;height:24px;border-radius:6px;display:block;
  background:linear-gradient(140deg,var(--zev),var(--ice));
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.25)}
.note{margin:18px 0 26px;padding:13px 15px;border:1px solid var(--line-soft);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--muted);font-size:13.5px;
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.04)}
.note b{color:var(--text)}
h1{font-size:clamp(30px,5.4vw,52px);margin:20px 0 8px;letter-spacing:-.03em;line-height:1.02;color:#fff}
.lead{color:var(--muted);margin:0;max-width:62ch}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(206px,1fr));gap:14px;margin-top:28px}

/* The card mirrors the app's: a lit stage for the case, then a data block
   whose price rail is the affordance — the whole tile is the button. */
.card{all:unset;cursor:pointer;border:1px solid var(--line);border-radius:10px;overflow:hidden;
  background:rgba(15,18,26,.7);display:flex;flex-direction:column;
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.05);
  transition:transform .3s cubic-bezier(.22,1,.36,1),border-color .3s,box-shadow .3s}
.card:hover,.card:focus-visible{transform:translateY(-3px);border-color:rgba(255,255,255,.15);
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.07),0 22px 48px -28px #000}
.card:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
.art{position:relative;aspect-ratio:4/3;display:grid;place-items:center;overflow:hidden;
  background:linear-gradient(180deg,#11141d 0%,#0b0e15 100%)}
.art::before{content:"";position:absolute;inset:0;opacity:.6;
  background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);
  background-size:64px 64px}
.art img{position:relative;width:100%;height:100%;object-fit:contain;display:block;
  transition:transform .5s cubic-bezier(.22,1,.36,1)}
.card:hover .art img{transform:scale(1.05)}
.meta-block{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px}
.nm{font-weight:650;font-size:14.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;white-space:nowrap}
.rail{display:flex;align-items:center;justify-content:space-between;height:38px;padding:0 11px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.035);
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.05);transition:border-color .3s,background .3s}
.card:hover .rail{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
.price{font-weight:700;font-size:15px;color:var(--gold-300)}
.tag{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;
  border:1px solid rgba(245,184,65,.4);color:var(--gold);padding:2px 6px;border-radius:2px}

dialog{border:none;background:transparent;padding:0;max-width:min(940px,94vw);width:100%}
dialog::backdrop{background:rgba(4,6,14,.86);backdrop-filter:blur(5px)}
.sheet{border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015)),rgba(15,18,26,.94);
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.09),0 32px 80px -32px rgba(0,0,0,.95)}
.sheet header{padding:14px 18px;border-bottom:1px solid var(--line-soft);justify-content:space-between}
.close{all:unset;cursor:pointer;color:var(--muted);font-size:22px;line-height:1;padding:3px 8px;border-radius:6px}
.close:hover{color:var(--text);background:rgba(255,255,255,.06)}

/* the reel bay */
.stage{position:relative;height:clamp(268px,46vw,330px);display:grid;place-items:center;
  background:radial-gradient(520px 260px at 50% 55%,rgba(255,255,255,.05),transparent);
  box-shadow:inset 0 0 60px -20px rgba(0,0,0,.9)}
.stage::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.3;
  background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.045) 0 1px,transparent 1px 3px)}
.stage img{position:absolute;width:min(360px,70vw);aspect-ratio:4/3;object-fit:contain}
#lid{transform-origin:50% 62%}
.burst{position:absolute;width:38%;height:46%;border-radius:999px;filter:blur(26px);opacity:0;transform-origin:50% 100%}
.reel{position:absolute;inset:0;display:none;align-items:center;overflow:hidden}
.reel::before,.reel::after{content:"";position:absolute;top:0;bottom:0;width:22%;z-index:3;pointer-events:none}
.reel::before{left:0;background:linear-gradient(90deg,var(--ink),transparent)}
.reel::after{right:0;background:linear-gradient(270deg,var(--ink),transparent)}
.reel .track{display:flex;gap:var(--gap);will-change:transform}
.reel .cell{width:var(--cell);flex:0 0 var(--cell);height:calc(var(--cell)*1.12);position:relative;
  border-radius:6px;border:1px solid rgba(255,255,255,.06);background:rgba(15,18,26,.8);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px;overflow:hidden}
.reel .cell img{position:static;width:80%;height:54%;object-fit:contain}
.reel .cell span{font-size:10px;color:var(--muted);text-align:center;line-height:1.2;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.reel .cell .edge{position:absolute;left:0;right:0;top:0;height:1px}
.reel .cell .foot{position:absolute;left:0;right:0;bottom:0;height:2px}
.needle{position:absolute;left:50%;top:0;bottom:0;width:1px;z-index:4;transform:translateX(-50%);
  background:linear-gradient(180deg,transparent,var(--ice),transparent);box-shadow:0 0 20px 2px var(--ice)}

.won{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;
  gap:4px;text-align:center;padding:12px;overflow:hidden}
.won img{position:static;width:min(210px,44vw);height:auto;aspect-ratio:4/3;object-fit:contain;flex:0 1 auto;min-height:0}
.won b{font-size:clamp(15px,4vw,20px);line-height:1.2;letter-spacing:-.01em}
.won .rule{display:flex;align-items:center;gap:8px;margin-bottom:2px}
.won .rule i{display:block;width:30px;height:1px}

.act{padding:13px 18px;border-top:1px solid var(--line-soft);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{all:unset;cursor:pointer;padding:9px 18px;border-radius:8px;font-weight:600;font-size:13.5px;color:#fff;
  background:var(--zev);border:1px solid var(--zev-400);
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.22),0 10px 26px -14px rgba(91,75,255,.95);
  transition:background .2s,box-shadow .2s}
.btn:hover{background:var(--zev-400)}
.btn[disabled]{opacity:.45;cursor:default}
.btn.ghost{background:rgba(255,255,255,.055);border-color:var(--line);
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.05)}
.btn.ghost:hover{background:rgba(255,255,255,.09)}

table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:7px 18px;border-bottom:1px solid rgba(255,255,255,.035)}
th{color:var(--dim);font-family:ui-monospace,monospace;font-weight:500;font-size:10px;
  letter-spacing:.14em;text-transform:uppercase}
td.r,th.r{text-align:right;white-space:nowrap}
td:first-child{width:99%}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:8px;vertical-align:middle}
.tbl{max-height:270px;overflow:auto}
footer{margin-top:44px;color:var(--dim);font-size:12.5px;line-height:1.7}
@media(max-width:560px){:root{--cell:92px;--gap:8px}.stage img{width:min(300px,68vw)}
  .act{padding:12px 14px}th,td{padding:7px 14px}.sheet header{padding:12px 14px}}
@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
</style>
</head>
<body>
<div class="wrap">
  <header><span class="logo"><i></i>ZEVORA</span></header>

  <h1>25 кейсов</h1>
  <p class="lead">Дизайн собран в Figma и отрисован в WebP, дроп-таблицы сбалансированы на маржу 36–44%, предметы — настоящие рендеры CS2 от Valve.</p>

  <div class="note">
    <b>Это витрина, а не сам сайт.</b> Zevora устроена так, что розыгрыш считается только на сервере:
    SQLite, сессии, транзакционное списание баланса и криптографический генератор за API. GitHub Pages
    отдаёт статику, поэтому здесь показаны дизайн кейсов, их настоящие дроп-таблицы и анимация открывания,
    а сам розыгрыш на этой странице — клиентский и ни на что не влияет. Рабочее приложение требует Node-хостинга.
  </div>

  <div class="grid">${cards}</div>

  <footer>
    Counter-Strike 2 и изображения предметов — собственность Valve Corporation. Zevora с Valve не связана.<br>
    Демонстрационная сборка: баланс и предметы виртуальные, платежи не проводятся. 18+.
  </footer>
</div>

<dialog id="dlg">
  <div class="sheet">
    <header>
      <span class="logo" id="dlgName"></span>
      <button class="close" id="dlgClose" aria-label="Закрыть">×</button>
    </header>
    <div class="stage" id="stage">
      <div class="burst" id="burst"></div>
      <img id="body" alt="">
      <img id="lid" alt="">
      <div class="reel" id="reel"><div class="track" id="track"></div><div class="needle"></div></div>
      <div class="won" id="won"></div>
    </div>
    <div class="act">
      <button class="btn" id="open">Открыть кейс</button>
      <button class="btn ghost" id="again" style="display:none">Ещё раз</button>
      <span class="meta" id="econ"></span>
    </div>
    <div class="tbl">
      <table><thead><tr><th>Предмет</th><th class="r">Шанс</th><th class="r">Цена</th></tr></thead><tbody id="rows"></tbody></table>
    </div>
  </div>
</dialog>

<script>
const CASES = ${JSON.stringify(data)};
const RARITY = ${JSON.stringify(RARITY)};
const money = (v) => v.toLocaleString("ru-RU") + " ₽";
const $ = (id) => document.getElementById(id);
let current = null, busy = false;

function drawTable(c) {
  $("rows").innerHTML = c.items.map((i) =>
    '<tr><td><span class="dot" style="background:' + (RARITY[i.rarity] || "#888") + '"></span>' +
    i.name + '</td><td class="r">' + (i.chance * 100).toFixed(i.chance < 0.001 ? 4 : 2) + '%</td>' +
    '<td class="r">' + money(i.price) + '</td></tr>').join("");
  $("econ").textContent = c.price
    ? "Средняя ценность " + money(c.ev) + " · маржа " + Math.round(c.margin * 100) + "%"
    : "Закрытый партнёрский кейс";
}

/** Same weighted draw the server does, but here it is only for show. */
function roll(c) {
  const total = c.items.reduce((a, i) => a + i.weight, 0);
  let t = Math.random() * total;
  for (const i of c.items) { t -= i.weight; if (t <= 0) return i; }
  return c.items[c.items.length - 1];
}

function openDialog(slug) {
  current = CASES.find((c) => c.slug === slug);
  $("dlgName").textContent = current.name;
  $("body").src = "cases/" + slug + "-body.webp";
  $("lid").src = "cases/" + slug + "-lid.webp";
  $("burst").style.background = current.shell;
  reset();
  drawTable(current);
  $("dlg").showModal();
}

function reset() {
  busy = false;
  for (const el of [$("body"), $("lid")]) { el.style.display = ""; el.style.transform = ""; el.style.opacity = ""; }
  $("burst").style.opacity = 0;
  $("reel").style.display = "none";
  $("won").style.display = "none";
  $("open").style.display = "";
  $("open").disabled = false;
  $("again").style.display = "none";
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function play() {
  if (busy || !current) return;
  busy = true;
  $("open").disabled = true;
  const prize = roll(current);

  const lid = $("lid"), body = $("body");
  // rattle
  const shake = [0, -5, 5, -7, 7, -4, 4, 0];
  for (const x of shake) {
    lid.style.transform = body.style.transform = "translateX(" + x + "px) rotate(" + (x / 6) + "deg)";
    await wait(78);
  }
  // lid off, light out
  $("burst").style.transition = "opacity .5s ease-out, transform .5s ease-out";
  $("burst").style.opacity = .9;
  $("burst").style.transform = "scaleY(1.2)";
  lid.style.transition = "transform .7s cubic-bezier(.22,.8,.3,1), opacity .7s ease-out";
  lid.style.transform = "translateY(-200px) scale(1.03)";
  lid.style.opacity = 0;
  await wait(680);

  // reel
  lid.style.display = "none";
  body.style.display = "none";
  $("burst").style.opacity = .25;
  const strip = [];
  for (let i = 0; i < 46; i++) strip.push(current.items[Math.floor(Math.random() * current.items.length)]);
  const WIN = 40;
  strip[WIN] = prize;
  $("track").innerHTML = strip.map((i) => {
    const c = RARITY[i.rarity] || "#888";
    // Rarity reads from the lit top edge and the underline, not a flood fill.
    return '<div class="cell" style="background-image:linear-gradient(0deg,' + c + '26 0%,' + c + '0D 32%,transparent 64%)">' +
      '<span class="edge" style="background:linear-gradient(90deg,transparent,' + c + ',transparent)"></span>' +
      (i.image ? '<img src="' + i.image + '" alt="">' : "") +
      '<span>' + i.name + '</span>' +
      '<span class="foot" style="background:' + c + '"></span></div>';
  }).join("");
  $("reel").style.display = "flex";
  // Read the cell pitch from CSS so the reel and the stylesheet can never
  // disagree about where the winning cell lands.
  const css = getComputedStyle(document.documentElement);
  const cell = parseFloat(css.getPropertyValue("--cell")) + parseFloat(css.getPropertyValue("--gap"));
  const stageW = $("stage").clientWidth;
  const target = WIN * cell + cell / 2 - stageW / 2 + (Math.random() - 0.5) * (cell * 0.5);
  const track = $("track");
  track.style.transition = "none";
  track.style.transform = "translateX(0)";
  void track.offsetWidth;
  track.style.transition = "transform 4.6s cubic-bezier(.12,.72,.12,1)";
  track.style.transform = "translateX(" + -target + "px)";
  await wait(4800);

  // result
  $("reel").style.display = "none";
  const pc = RARITY[prize.rarity] || "#fff";
  $("won").innerHTML =
    '<span class="rule"><i style="background:linear-gradient(90deg,transparent,' + pc + ')"></i>' +
    '<span class="meta" style="color:' + pc + '">Предмет получен</span>' +
    '<i style="background:linear-gradient(90deg,' + pc + ',transparent)"></i></span>' +
    (prize.image ? '<img src="' + prize.image + '" alt="">' : "") +
    '<b style="color:' + pc + '">' + prize.name + '</b>' +
    '<span class="meta tnum">' + money(prize.price) + " · шанс " + (prize.chance * 100).toFixed(2) + "%</span>";
  $("won").style.display = "flex";
  $("open").style.display = "none";
  $("again").style.display = "";
  busy = false;
}

document.querySelectorAll(".card").forEach((el) =>
  el.addEventListener("click", () => openDialog(el.dataset.slug)));
$("dlgClose").addEventListener("click", () => $("dlg").close());
$("open").addEventListener("click", play);
$("again").addEventListener("click", () => { reset(); play(); });
$("dlg").addEventListener("close", reset);
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, "index.html"), html);

  const imgs = fs.readdirSync(path.join(OUT, "skins")).length;
  console.log(`docs/index.html — ${data.length} кейсов, ${imgs} рендеров скинов, ${fs.readdirSync(path.join(OUT, "cases")).length} файлов кейсов`);
}

main();
