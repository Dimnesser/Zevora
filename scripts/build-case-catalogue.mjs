/**
 * Builds the drop tables for the 25 cases into lib/server/cases.json.
 *
 * Items are picked from the skin catalogue by the `pool` rule in
 * case-catalogue.mjs, then weights are solved so the case lands on its
 * target margin.
 *
 * The weight curve is w_i ∝ (1 / price_i)^alpha: cheap items are common,
 * expensive ones rare, and `alpha` is the single knob. Raising alpha
 * pushes probability toward the cheap end and lowers the expected value,
 * so a bisection on alpha hits any reachable margin exactly — with the
 * ordering "cheaper is likelier" guaranteed by construction rather than
 * hand-tuned per item.
 *
 *   node scripts/build-case-catalogue.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { CASES } from "./case-catalogue.mjs";

const SEED = path.join(process.cwd(), "lib", "server", "seed-data.ts");
const OUT = path.join(process.cwd(), "lib", "server", "cases.json");
const TOTAL_WEIGHT = 100000;

/** Reads the skin catalogue straight out of the seed source. */
function readSkins() {
  const src = fs.readFileSync(SEED, "utf8");
  const re = /\{ slug: "([a-z0-9-]+)", market_name: "([^"]+)", weapon: "([^"]+)", finish: "([^"]+)", rarity: "([a-z]+)", price: (\d+)/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    out.push({ slug: m[1], market_name: m[2], weapon: m[3], finish: m[4], rarity: m[5], price: Number(m[6]) });
  }
  return out;
}

/** Expected value of a weight assignment, in minor units. */
const ev = (items, ws) => {
  const total = ws.reduce((a, b) => a + b, 0);
  return items.reduce((a, it, i) => a + (ws[i] * it.price) / total, 0);
};

/** w_i ∝ (1/price)^alpha, normalised so nothing underflows to zero. */
function weightsFor(items, alpha) {
  const raw = items.map((it) => Math.pow(1 / Math.max(it.price, 1), alpha));
  const max = Math.max(...raw);
  return raw.map((r) => r / max);
}

/**
 * Bisect alpha so the case hits its target expected value.
 *
 * EV falls monotonically as alpha rises, so the bracket only has to be
 * wide enough to contain the answer. Negative alpha is allowed and is
 * what a premium case needs: it tilts probability toward the expensive
 * end instead of away from it.
 */
function solve(items, targetEv) {
  let lo = -8, hi = 8;
  const at = (a) => ev(items, weightsFor(items, a));
  // Uniform weights are the most a case can pay out before the curve
  // starts favouring the jackpot; clamp rather than run away.
  if (at(lo) < targetEv) return lo;
  if (at(hi) > targetEv) return hi;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) > targetEv) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function pick(skins, pool) {
  let pond = skins;
  if (pool.weapons) pond = pond.filter((s) => pool.weapons.some((w) => s.weapon.startsWith(w)));
  if (pool.exclude) pond = pond.filter((s) => !pool.exclude.some((w) => s.weapon.startsWith(w)));

  const floor = pool.floor;
  const ceil = pool.ceil;
  let band = pond.filter((s) => s.price >= floor && s.price <= ceil);

  // A thin band gets widened downward only. Reaching past the ceiling
  // would hand the case a jackpot from a higher tier, which is exactly
  // what the ceiling exists to prevent.
  if (band.length < pool.count) {
    band = pond.filter((s) => s.price <= ceil).sort((a, b) => b.price - a.price).slice(0, pool.count);
  }

  band = [...band].sort((a, b) => a.price - b.price);
  if (band.length <= pool.count) return band;

  // Spread the picks across the band, always keeping the floor and the
  // jackpot at the ends.
  const step = (band.length - 1) / (pool.count - 1);
  const chosen = new Map();
  for (let i = 0; i < pool.count; i++) chosen.set(band[Math.round(i * step)].slug, band[Math.round(i * step)]);
  chosen.set(band[0].slug, band[0]);
  chosen.set(band[band.length - 1].slug, band[band.length - 1]);
  return [...chosen.values()].sort((a, b) => a.price - b.price);
}

const f = (v) => Math.round(v).toLocaleString("ru-RU");

function main() {
  const skins = readSkins();
  if (skins.length === 0) throw new Error("не удалось прочитать каталог скинов из seed-data.ts");

  const out = [];
  const report = [];

  CASES.forEach((c, order) => {
    const items = pick(skins, c.pool);
    let ws;

    if (c.price === 0) {
      // The partner case is free, so there is no margin to solve — weight
      // it by rarity instead, cheapest most likely.
      ws = weightsFor(items, 0.9);
    } else {
      const target = c.price * (1 - c.pool.margin);
      ws = weightsFor(items, solve(items, target));
    }

    const sum = ws.reduce((a, b) => a + b, 0);
    const weights = ws.map((w) => Math.max(1, Math.round((w / sum) * TOTAL_WEIGHT)));
    const realEv = ev(items, weights);

    out.push({
      slug: c.slug, name: c.name, description: c.description,
      price: c.price, tags: c.tags, partner_only: Boolean(c.partner_only),
      image: `/cases/${c.slug}.webp`,
      shell: c.shell, ink: c.ink, mark: c.mark, sort_order: order,
      items: Object.fromEntries(items.map((it, i) => [it.slug, weights[i]])),
    });

    report.push({
      slug: c.slug, price: c.price, items: items.length, ev: Math.round(realEv),
      margin: c.price ? 1 - realEv / c.price : null,
      target: c.pool.margin, cheapest: items[0].price,
      top: items[items.length - 1].market_name,
      topChance: weights[weights.length - 1] / weights.reduce((a, b) => a + b, 0),
    });
  });

  // A case whose pool cannot back its price is a design bug, not something
  // to ship quietly: the solver clamps and the margin silently goes wrong.
  const broken = report.filter((r) => r.margin != null && Math.abs(r.margin - r.target) > 0.08);
  if (broken.length) {
    for (const b of broken) {
      console.error(
        `\x1b[31m✗\x1b[0m ${b.slug}: маржа ${(b.margin * 100).toFixed(0)}% вместо ${(b.target * 100).toFixed(0)}% — ` +
        `пул (${b.items} предм., от ${f(b.cheapest)} ₽) не тянет цену ${f(b.price)} ₽`,
      );
    }
    process.exitCode = 1;
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

  console.log(`${"кейс".padEnd(20)}${"цена".padStart(11)}${"предм.".padStart(8)}${"ср. ценность".padStart(15)}${"маржа".padStart(8)}  топ-предмет`);
  console.log("─".repeat(108));
  for (const r of report) {
    console.log(
      r.slug.padEnd(20) +
      `${f(r.price)} ₽`.padStart(11) +
      String(r.items).padStart(8) +
      `${f(Math.round(r.ev))} ₽`.padStart(15) +
      (r.margin == null ? "     —  " : `${(r.margin * 100).toFixed(0)}%`.padStart(8)) +
      `  ${r.top} (${(r.topChance * 100).toFixed(3)}%)`,
    );
  }
  console.log(`\n${out.length} кейсов → ${path.relative(process.cwd(), OUT)}`);
}

main();
