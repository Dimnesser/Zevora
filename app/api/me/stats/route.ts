import { bootstrap } from "@/lib/server/bootstrap";
import { getDb } from "@/lib/server/db";
import { handler, ok, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Aggregates for the profile page, computed from the ledger and openings. */
export const GET = handler(async () => {
  bootstrap();
  const user = await requireUser();
  const db = getDb();

  const opens = db
    .prepare(
      `SELECT COUNT(*) AS cases_opened,
              COALESCE(SUM(price_paid_minor), 0) AS spent_minor,
              COALESCE(SUM(value_minor), 0) AS won_minor,
              COALESCE(MAX(value_minor), 0) AS best_minor
         FROM case_openings WHERE user_id = ?`,
    )
    .get(user.id) as {
    cases_opened: number;
    spent_minor: number;
    won_minor: number;
    best_minor: number;
  };

  const upgrades = db
    .prepare(
      `SELECT
         SUM(CASE WHEN kind IN ('upgrade-win','upgrade-loss') THEN 1 ELSE 0 END) AS total,
         SUM(CASE WHEN kind = 'upgrade-win' THEN 1 ELSE 0 END) AS won
       FROM transactions WHERE user_id = ?`,
    )
    .get(user.id) as { total: number | null; won: number | null };

  const inventory = db
    .prepare(
      `SELECT COUNT(*) AS items,
              COALESCE(SUM(price_minor), 0) AS value_minor
         FROM inventory_items
        WHERE user_id = ? AND status IN ('owned','withdrawing')`,
    )
    .get(user.id) as { items: number; value_minor: number };

  const best = db
    .prepare(
      `SELECT s.market_name, o.value_minor, o.created_at
         FROM case_openings o JOIN skins s ON s.id = o.skin_id
        WHERE o.user_id = ?
        ORDER BY o.value_minor DESC LIMIT 1`,
    )
    .get(user.id) as
    | { market_name: string; value_minor: number; created_at: number }
    | undefined;

  // 14-day activity series, bucketed by local day from real openings.
  const dayMs = 86_400_000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const seriesStart = startOfToday.getTime() - 13 * dayMs;

  const rawDays = db
    .prepare(
      `SELECT created_at, price_paid_minor, value_minor
         FROM case_openings
        WHERE user_id = ? AND created_at >= ?`,
    )
    .all(user.id, seriesStart) as {
    created_at: number;
    price_paid_minor: number;
    value_minor: number;
  }[];

  const buckets = new Map<number, { opens: number; spent: number; won: number }>();
  for (const row of rawDays) {
    const index = Math.floor((row.created_at - seriesStart) / dayMs);
    if (index < 0 || index > 13) continue;
    const bucket = buckets.get(index) ?? { opens: 0, spent: 0, won: 0 };
    bucket.opens += 1;
    bucket.spent += row.price_paid_minor;
    bucket.won += row.value_minor;
    buckets.set(index, bucket);
  }

  const series = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(seriesStart + i * dayMs);
    const bucket = buckets.get(i) ?? { opens: 0, spent: 0, won: 0 };
    return {
      day: `${String(date.getDate()).padStart(2, "0")}.${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`,
      opens: bucket.opens,
      spent_minor: bucket.spent,
      won_minor: bucket.won,
    };
  });

  return ok({
    series,
    stats: {
      cases_opened: opens.cases_opened,
      spent_minor: opens.spent_minor,
      won_minor: opens.won_minor,
      best_minor: opens.best_minor,
      upgrades: upgrades.total ?? 0,
      upgrades_won: upgrades.won ?? 0,
      inventory_items: inventory.items,
      inventory_value_minor: inventory.value_minor,
      best_drop: best ?? null,
    },
  });
});
