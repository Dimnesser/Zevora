import { bootstrap } from "@/lib/server/bootstrap";
import { getDb } from "@/lib/server/db";
import { handler, ok, requireOwner } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  bootstrap();
  await requireOwner();

  const query = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const where = query ? "WHERE u.username LIKE ?" : "";
  const params = query ? [`%${query}%`] : [];

  const users = getDb()
    .prepare(
      `SELECT u.id, u.username, u.avatar_seed, u.role, u.balance_minor,
              u.partner_tier, u.partner_since, u.promo_code, u.ref_code,
              u.partner_perks, u.partner_daily_minor, u.partner_ref_multiplier,
              u.partner_campaigns, u.created_at,
              COALESCE((SELECT SUM(o.price_paid_minor) FROM case_openings o
                         WHERE o.user_id = u.id), 0) AS spent_minor,
              (SELECT COUNT(*) FROM case_openings o WHERE o.user_id = u.id) AS opens
         FROM users u
         ${where}
        ORDER BY spent_minor DESC, u.id ASC
        LIMIT 200`,
    )
    .all(...params);

  return ok({ users });
});
