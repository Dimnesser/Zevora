import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { credit } from "@/lib/server/ledger";
import { toMinor } from "@/lib/server/money";
import { ApiError, handler, ok, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const AMOUNT = toMinor(500);

export const POST = handler(async () => {
  bootstrap();
  const user = await requireUser();

  const result = transact(() => {
    const db = getDb();
    // Conditional UPDATE: the flag flips exactly once, so a replayed
    // request credits nothing.
    const res = db
      .prepare(
        `UPDATE users SET registration_bonus_claimed = 1, updated_at = ?
          WHERE id = ? AND registration_bonus_claimed = 0`,
      )
      .run(now(), user.id);

    if (res.changes === 0) {
      throw new ApiError("conflict", "Бонус за регистрацию уже получен");
    }

    const balance = credit({
      userId: user.id,
      kind: "bonus",
      label: "Бонус за регистрацию",
      amountMinor: AMOUNT,
    });

    return { amount_minor: AMOUNT, balance_minor: balance };
  });

  return ok(result);
});
