import { bootstrap } from "@/lib/server/bootstrap";
import { getDb } from "@/lib/server/db";
import { handler, ok } from "@/lib/server/http";
import { periodStart, type Period } from "@/lib/server/stats";

export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["today", "week", "month", "all"];

/**
 * Ranking built from real openings — the sums come from case_openings,
 * not from a seeded table.
 */
export const GET = handler(async (req: Request) => {
  bootstrap();
  const url = new URL(req.url);
  const periodParam = url.searchParams.get("period") as Period | null;
  const period: Period =
    periodParam && PERIODS.includes(periodParam) ? periodParam : "week";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 100);

  const rows = getDb()
    .prepare(
      `SELECT u.id, u.username, u.avatar_seed, u.partner_tier,
              COUNT(o.id) AS opens,
              COALESCE(SUM(o.price_paid_minor), 0) AS spent_minor,
              COALESCE(SUM(o.value_minor), 0) AS won_minor,
              COALESCE(MAX(o.value_minor), 0) AS best_minor
         FROM users u
         JOIN case_openings o ON o.user_id = u.id AND o.created_at >= ?
        GROUP BY u.id
        ORDER BY won_minor DESC
        LIMIT ?`,
    )
    .all(periodStart(period), limit) as {
    id: number;
    username: string;
    avatar_seed: string;
    partner_tier: string | null;
    opens: number;
    spent_minor: number;
    won_minor: number;
    best_minor: number;
  }[];

  return ok({
    period,
    rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
  });
});
