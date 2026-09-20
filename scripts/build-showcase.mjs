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
          image: (IMAGES[s.name]?.image) ?? null,
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
  for (const url of needed) {
    const file = url.replace(/^\/skins\//, "");
    const src = path.join(ROOT, "public", "skins", file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, "skins", file));
  }
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

  const cards = data.map((c) => `
    <button class="card" data-slug="${esc(c.slug)}" type="button">
      <div class="art"><img src="cases/${esc(c.slug)}.webp" alt="Кейс ${esc(c.name)}" loading="lazy" width="640" height="480"></div>
      <div class="meta">
        <div class="row"><span class="nm">${esc(c.name)}</span>${c.partner ? '<span class="tag">Партнёрский</span>' : ""}</div>
        <div class="row sub"><span class="price">${c.price ? money(c.price) : "Бесплатно"}</span><span class="cnt">${c.items.length} предм.</span></div>
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
:root{--void:#05060C;--surface:#0D1020;--elev:#121627;--line:#1E2338;--zev:#5B4BFF;--aqua:#22D3EE;--gold:#F5B841;--text:#E8ECF6;--muted:#8B95AE}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#141a33,var(--void));color:var(--text);font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
.wrap{max-width:1240px;margin:0 auto;padding:0 16px 72px}
header{padding:28px 0 8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.22em;font-size:15px}
.logo i{width:26px;height:26px;border-radius:8px;background:linear-gradient(140deg,var(--zev),var(--aqua));display:block}
.note{margin:18px 0 26px;padding:13px 15px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.02);color:var(--muted);font-size:13.5px}
.note b{color:var(--text)}
h1{font-size:clamp(28px,5vw,42px);margin:22px 0 6px;letter-spacing:-.02em}
.lead{color:var(--muted);margin:0 0 6px;max-width:62ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:14px;margin-top:26px}
.card{all:unset;cursor:pointer;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--surface);display:flex;flex-direction:column;transition:transform .25s,border-color .25s,box-shadow .25s}
.card:hover,.card:focus-visible{transform:translateY(-3px);border-color:rgba(255,255,255,.18);box-shadow:0 18px 40px -26px #000}
.card:focus-visible{outline:2px solid var(--aqua);outline-offset:2px}
.art{background:linear-gradient(180deg,#d8dae0,#9ea3ae);aspect-ratio:4/3;display:grid;place-items:center}
.art img{width:100%;height:100%;object-fit:contain;display:block}
.meta{padding:10px 12px 12px;display:flex;flex-direction:column;gap:5px}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.nm{font-weight:650;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sub{font-size:12.5px;color:var(--muted)}
.price{color:var(--gold);font-weight:700}
.tag{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;border:1px solid rgba(245,184,65,.4);color:var(--gold);padding:2px 6px;border-radius:6px}
dialog{border:none;background:transparent;padding:0;max-width:min(940px,94vw);width:100%}
dialog::backdrop{background:rgba(4,6,14,.82);backdrop-filter:blur(4px)}
.sheet{border:1px solid var(--line);border-radius:20px;background:var(--surface);overflow:hidden}
.sheet header{padding:16px 20px;border-bottom:1px solid var(--line);justify-content:space-between}
.close{all:unset;cursor:pointer;color:var(--muted);font-size:22px;line-height:1;padding:4px 8px;border-radius:8px}
.close:hover{color:var(--text);background:rgba(255,255,255,.06)}
.stage{position:relative;height:320px;display:grid;place-items:center;background:radial-gradient(520px 260px at 50% 55%,rgba(255,255,255,.06),transparent)}
.stage img{position:absolute;width:min(400px,72vw);aspect-ratio:4/3;object-fit:contain}
#lid{transform-origin:50% 62%}
.burst{position:absolute;width:38%;height:46%;border-radius:999px;filter:blur(26px);opacity:0;transform-origin:50% 100%}
.reel{position:absolute;inset:0;display:none;align-items:center;overflow:hidden}
.reel .track{display:flex;gap:10px;will-change:transform}
.reel .cell{width:132px;flex:0 0 132px;height:150px;border-radius:12px;border:1px solid var(--line);background:var(--elev);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px}
.reel .cell img{position:static;width:104px;height:78px;object-fit:contain}
.reel .cell span{font-size:10.5px;color:var(--muted);text-align:center;line-height:1.25}
.needle{position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--aqua);box-shadow:0 0 16px var(--aqua);transform:translateX(-50%)}
.won{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:16px}
.won img{position:static;width:230px;height:172px;object-fit:contain}
.won b{font-size:19px}
.act{padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{all:unset;cursor:pointer;padding:10px 18px;border-radius:12px;background:linear-gradient(120deg,var(--zev),#7C5CFF);font-weight:650;font-size:14px}
.btn[disabled]{opacity:.5;cursor:default}
.btn.ghost{background:rgba(255,255,255,.05);border:1px solid var(--line)}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:7px 20px;border-bottom:1px solid rgba(255,255,255,.04)}
th{color:var(--muted);font-weight:600;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
td.r,th.r{text-align:right}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;vertical-align:middle}
.tbl{max-height:270px;overflow:auto}
footer{margin-top:44px;color:var(--muted);font-size:12.5px;line-height:1.7}
@media(max-width:560px){.stage{height:260px}.reel .cell{width:108px;flex-basis:108px}}
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
      <span class="sub" id="econ"></span>
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
  $("track").innerHTML = strip.map((i) =>
    '<div class="cell" style="border-color:' + (RARITY[i.rarity] || "#888") + '55">' +
    (i.image ? '<img src="' + i.image + '" alt="">' : "") +
    '<span>' + i.name + '</span></div>').join("");
  $("reel").style.display = "flex";
  const cell = window.matchMedia("(max-width:560px)").matches ? 118 : 142;
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
  $("won").innerHTML =
    (prize.image ? '<img src="' + prize.image + '" alt="">' : "") +
    '<b style="color:' + (RARITY[prize.rarity] || "#fff") + '">' + prize.name + '</b>' +
    '<span class="sub">' + money(prize.price) + " · шанс " + (prize.chance * 100).toFixed(2) + "%</span>";
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
