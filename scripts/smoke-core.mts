/**
 * Core smoke test: seeds a scratch database, then exercises the draw and
 * the opening transaction without going through HTTP.
 */
process.env.ZEVORA_DB_FILE = "/tmp/zevora-smoke.db";

const fs = await import("node:fs");
for (const f of ["/tmp/zevora-smoke.db","/tmp/zevora-smoke.db-wal","/tmp/zevora-smoke.db-shm"]) { if (fs.existsSync(f)) fs.unlinkSync(f); }

const { getDb } = await import("@/lib/server/db");
const { seed } = await import("@/lib/server/seed");
const { getCaseItems, getCaseBySlug, openCase } = await import("@/lib/server/cases");
const { userForToken, createSession } = await import("@/lib/server/auth");

seed();
const db = getDb();

console.log("rarities:", (db.prepare("SELECT COUNT(*) n FROM rarities").get() as any).n);
console.log("skins:   ", (db.prepare("SELECT COUNT(*) n FROM skins").get() as any).n);
console.log("cases:   ", (db.prepare("SELECT COUNT(*) n FROM cases").get() as any).n);
console.log("items:   ", (db.prepare("SELECT COUNT(*) n FROM case_items").get() as any).n);

// Expected value / margin per case
console.log("\n--- case economics ---");
for (const c of db.prepare("SELECT id, slug, name, price_minor FROM cases").all() as any[]) {
  const items = getCaseItems(c.id);
  const ev = items.reduce((s, i) => s + i.chance * i.base_price_minor, 0);
  const margin = c.price_minor > 0 ? 1 - ev / c.price_minor : 0;
  const sum = items.reduce((s, i) => s + i.chance, 0);
  console.log(
    `${c.slug.padEnd(18)} price=${(c.price_minor / 100).toFixed(0).padStart(6)}₽  EV=${(ev / 100).toFixed(0).padStart(6)}₽  margin=${(margin * 100).toFixed(1).padStart(5)}%  Σp=${sum.toFixed(6)}`,
  );
}

// Open a case as the demo user
const token = createSession(1);
const user = userForToken(token)!;
console.log("\nuser:", user.username, "balance:", user.balance_minor / 100);

const res = openCase(user, "chas-volka", "smoke-key-1");
console.log("won:", res.item.market_name, res.item.wear, "st:" + res.item.stattrak,
            (res.item.price_minor / 100).toFixed(2) + "₽",
            "| roll", res.audit.roll, "/", res.audit.total_weight);
console.log("balance after:", res.balance_minor / 100);

// Idempotency: same key must replay, not recharge
const replay = openCase(user, "chas-volka", "smoke-key-1");
console.log("replay same opening_id:", replay.opening_id === res.opening_id);
console.log("replay balance unchanged:", replay.balance_minor === res.balance_minor);
const bal = (db.prepare("SELECT balance_minor FROM users WHERE id=1").get() as any).balance_minor;
console.log("db balance still:", bal / 100);
console.log("openings rows:", (db.prepare("SELECT COUNT(*) n FROM case_openings").get() as any).n);
console.log("inventory rows:", (db.prepare("SELECT COUNT(*) n FROM inventory_items").get() as any).n);
