import "server-only";

import { getDb } from "@/lib/server/db";

export type Period = "today" | "week" | "month" | "all";

/** Start timestamp for a reporting window. */
export function periodStart(period: Period): number {
  const d = new Date();
  switch (period) {
    case "today":
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    case "week":
      return Date.now() - 7 * 86_400_000;
    case "month":
      return Date.now() - 30 * 86_400_000;
    case "all":
    default:
      return 0;
  }
}

export interface CaseStats {
  opens: number;
  revenue_minor: number;
  payout_minor: number;
  margin: number;
  avg_value_minor: number;
  best: {
    market_name: string;
    value_minor: number;
    username: string;
    created_at: number;
  } | null;
  drops: {
    skin_id: number;
    market_name: string;
    rarity_name: string;
    rarity_color: string;
    weight: number;
    /** weight / total — what the table promises. */
    expected: number;
    count: number;
    /** count / opens — what actually happened. */
    actual: number;
  }[];
}

/**
 * Per-case statistics, including expected vs. observed drop rates.
 *
 * The two columns are what makes a drop table auditable: over enough
 * openings `actual` converges on `expected`, and a persistent gap means
 * the weights and the roll disagree.
 */
export function caseStats(caseId: number, period: Period): CaseStats {
  const db = getDb();
  const since = periodStart(period);

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS opens,
              COALESCE(SUM(price_paid_minor), 0) AS revenue_minor,
              COALESCE(SUM(value_minor), 0) AS payout_minor
         FROM case_openings
        WHERE case_id = ? AND created_at >= ?`,
    )
    .get(caseId, since) as {
    opens: number;
    revenue_minor: number;
    payout_minor: number;
  };

  const best = db
    .prepare(
      `SELECT s.market_name, o.value_minor, u.username, o.created_at
         FROM case_openings o
         JOIN skins s ON s.id = o.skin_id
         JOIN users u ON u.id = o.user_id
        WHERE o.case_id = ? AND o.created_at >= ?
        ORDER BY o.value_minor DESC LIMIT 1`,
    )
    .get(caseId, since) as CaseStats["best"];

  const items = db
    .prepare(
      `SELECT ci.skin_id, ci.weight, s.market_name,
              r.name AS rarity_name, r.color AS rarity_color
         FROM case_items ci
         JOIN skins s ON s.id = ci.skin_id
         JOIN rarities r ON r.id = s.rarity_id
        WHERE ci.case_id = ?
        ORDER BY r.sort_order DESC, s.base_price_minor DESC`,
    )
    .all(caseId) as {
    skin_id: number;
    weight: number;
    market_name: string;
    rarity_name: string;
    rarity_color: string;
  }[];

  const counts = db
    .prepare(
      `SELECT skin_id, COUNT(*) AS n
         FROM case_openings
        WHERE case_id = ? AND created_at >= ?
        GROUP BY skin_id`,
    )
    .all(caseId, since) as { skin_id: number; n: number }[];

  const countMap = new Map(counts.map((c) => [c.skin_id, c.n]));
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);

  return {
    opens: totals.opens,
    revenue_minor: totals.revenue_minor,
    payout_minor: totals.payout_minor,
    margin:
      totals.revenue_minor > 0
        ? 1 - totals.payout_minor / totals.revenue_minor
        : 0,
    avg_value_minor:
      totals.opens > 0 ? Math.round(totals.payout_minor / totals.opens) : 0,
    best: best ?? null,
    drops: items.map((i) => {
      const count = countMap.get(i.skin_id) ?? 0;
      return {
        skin_id: i.skin_id,
        market_name: i.market_name,
        rarity_name: i.rarity_name,
        rarity_color: i.rarity_color,
        weight: i.weight,
        expected: totalWeight > 0 ? i.weight / totalWeight : 0,
        count,
        actual: totals.opens > 0 ? count / totals.opens : 0,
      };
    }),
  };
}

/** Platform-wide totals for the admin dashboard. */
export function platformStats(period: Period) {
  const db = getDb();
  const since = periodStart(period);

  const opens = db
    .prepare(
      `SELECT COUNT(*) AS opens,
              COALESCE(SUM(price_paid_minor), 0) AS revenue_minor,
              COALESCE(SUM(value_minor), 0) AS payout_minor
         FROM case_openings WHERE created_at >= ?`,
    )
    .get(since) as { opens: number; revenue_minor: number; payout_minor: number };

  const users = db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as {
    n: number;
  };
  const active = db
    .prepare(
      `SELECT COUNT(DISTINCT user_id) AS n FROM case_openings WHERE created_at >= ?`,
    )
    .get(since) as { n: number };

  return {
    opens: opens.opens,
    revenue_minor: opens.revenue_minor,
    payout_minor: opens.payout_minor,
    margin:
      opens.revenue_minor > 0 ? 1 - opens.payout_minor / opens.revenue_minor : 0,
    users: users.n,
    active_users: active.n,
  };
}
