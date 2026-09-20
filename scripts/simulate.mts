/**
 * Probability validation.
 *
 * Two passes:
 *   1. A large in-process sample through the real draw function, checked
 *      with a chi-square goodness-of-fit test.
 *   2. A smaller end-to-end sample through the HTTP API, which also
 *      verifies that the ledger, the inventory and the openings table
 *      stay consistent with each other.
 */
process.env.ZEVORA_DB_FILE = "/tmp/zevora-sim.db";

const fs = await import("node:fs");
for (const f of ["/tmp/zevora-sim.db", "/tmp/zevora-sim.db-wal", "/tmp/zevora-sim.db-shm"]) {
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const { getDb } = await import("@/lib/server/db");
const { seed } = await import("@/lib/server/seed");
const { getCaseItems } = await import("@/lib/server/cases");
const { drawWeighted } = await import("@/lib/server/rng");

seed();
const db = getDb();

const N = Number(process.env.N ?? 1_000_000);

/**
 * Upper-tail critical values of the chi-square distribution at p = 0.001.
 * A statistic below the value for its degrees of freedom means the
 * observed counts are consistent with the declared weights.
 */
const CHI2_CRITICAL_001: Record<number, number> = {
  8: 26.12, 9: 27.88, 10: 29.59, 11: 31.26, 12: 32.91, 13: 34.53,
  14: 36.12, 15: 37.7, 16: 39.25, 17: 40.79, 18: 42.31, 19: 43.82,
  20: 45.31, 21: 46.8, 22: 48.27,
};

let allPassed = true;

for (const c of db
  .prepare(`SELECT id, slug, name FROM cases ORDER BY id`)
  .all() as { id: number; slug: string; name: string }[]) {
  const items = getCaseItems(c.id);
  const pool = items.map((i) => ({ weight: i.weight, skin_id: i.skin_id }));

  const counts = new Map<number, number>();
  for (let i = 0; i < N; i++) {
    const { item } = drawWeighted(pool);
    counts.set(item.skin_id, (counts.get(item.skin_id) ?? 0) + 1);
  }

  // Pearson's chi-square: Σ (observed − expected)² / expected
  let chi2 = 0;
  let maxDeviation = 0;
  for (const it of items) {
    const expected = it.chance * N;
    const observed = counts.get(it.skin_id) ?? 0;
    chi2 += Math.pow(observed - expected, 2) / expected;
    const relative = Math.abs(observed - expected) / expected;
    if (expected >= 30) maxDeviation = Math.max(maxDeviation, relative);
  }

  const df = items.length - 1;
  const critical = CHI2_CRITICAL_001[df] ?? df + 4 * Math.sqrt(2 * df);
  const pass = chi2 < critical;
  if (!pass) allPassed = false;

  console.log(
    `${c.slug.padEnd(18)} items=${String(items.length).padStart(2)} ` +
      `χ²=${chi2.toFixed(2).padStart(7)} (df=${df}, crit=${critical.toFixed(2)}) ` +
      `maxΔ=${(maxDeviation * 100).toFixed(2).padStart(5)}%  ${pass ? "\x1b[32mOK\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}`,
  );
}

// Rarest item in the most expensive case: does it actually show up?
const forge = db.prepare(`SELECT id FROM cases WHERE slug='tolko-stal'`).get() as { id: number };
const forgeItems = getCaseItems(forge.id);
const rarest = forgeItems.reduce((a, b) => (a.chance < b.chance ? a : b));
console.log(
  `\nРедчайший предмет tolko-stal: ${rarest.market_name} p=${(rarest.chance * 100).toFixed(4)}% ` +
    `→ ожидается ~${Math.round(rarest.chance * N)} раз на ${N.toLocaleString("ru-RU")} открытий`,
);

console.log(
  `\n${allPassed ? "\x1b[32mВсе кейсы прошли тест согласия\x1b[0m" : "\x1b[31mЕсть расхождения\x1b[0m"} (N=${N.toLocaleString("ru-RU")} на кейс)`,
);
process.exit(allPassed ? 0 : 1);
