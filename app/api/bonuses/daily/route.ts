import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { credit } from "@/lib/server/ledger";
import { toMinor } from "@/lib/server/money";
import { ApiError, handler, ok, requireUser } from "@/lib/server/http";
import { TIERS } from "@/data/partners";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const DAILY_BASE = toMinor(150);
const MAX_STREAK_DAYS = 7;

export const POST = handler(async () => {
  bootstrap();
  const user = await requireUser();

  const result = transact(() => {
    const db = getDb();
    // Re-read inside the transaction: the cached session row could be
    // stale if another tab just claimed.
    const fresh = db
      .prepare(
        `SELECT daily_claimed_at, daily_streak, partner_tier, partner_daily_minor
           FROM users WHERE id = ?`,
      )
      .get(user.id) as {
      daily_claimed_at: number | null;
      daily_streak: number;
      partner_tier: string | null;
      partner_daily_minor: number | null;
    };

    const ts = now();
    if (fresh.daily_claimed_at && ts - fresh.daily_claimed_at < DAY) {
      throw new ApiError(
        "conflict",
        "Бонус уже получен. Возвращайтесь завтра",
      );
    }

    const continues =
      fresh.daily_claimed_at !== null && ts - fresh.daily_claimed_at < 2 * DAY;
    const streak = continues ? fresh.daily_streak + 1 : 1;

    const partnerBonus =
      fresh.partner_daily_minor ??
      (fresh.partner_tier
        ? toMinor(TIERS[fresh.partner_tier as keyof typeof TIERS].dailyReward)
        : 0);

    const amount = DAILY_BASE * Math.min(streak, MAX_STREAK_DAYS) + partnerBonus;

    db.prepare(
      `UPDATE users SET daily_claimed_at = ?, daily_streak = ?, updated_at = ?
        WHERE id = ?`,
    ).run(ts, streak, ts, user.id);

    const balance = credit({
      userId: user.id,
      kind: "bonus",
      label: `Ежедневный бонус — день ${streak}`,
      amountMinor: amount,
    });

    return { amount_minor: amount, streak, balance_minor: balance };
  });

  return ok(result);
});
