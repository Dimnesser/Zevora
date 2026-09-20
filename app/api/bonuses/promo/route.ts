import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { credit } from "@/lib/server/ledger";
import {
  ApiError,
  asString,
  handler,
  ok,
  rateLimit,
  readJson,
  requireUser,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  // Stops a script from walking the code space.
  rateLimit(`promo:${user.id}`, 10, 60_000);

  const body = await readJson<{ code?: unknown }>(req);
  const code = asString(body.code, "code", { min: 2, max: 40 }).toUpperCase();

  const result = transact(() => {
    const db = getDb();
    const promo = db
      .prepare(
        `SELECT id, code, amount_minor FROM promo_codes
          WHERE code = ? AND is_active = 1`,
      )
      .get(code) as { id: number; code: string; amount_minor: number } | undefined;

    if (!promo) throw new ApiError("not_found", "Промокод не найден");

    // UNIQUE(user_id, promo_id) is what actually enforces one use each;
    // the insert below fails rather than double-crediting under a race.
    try {
      db.prepare(
        `INSERT INTO promo_redemptions (user_id, promo_id, created_at)
         VALUES (?, ?, ?)`,
      ).run(user.id, promo.id, now());
    } catch {
      throw new ApiError("conflict", "Промокод уже использован");
    }

    const balance = credit({
      userId: user.id,
      kind: "promo",
      label: `Промокод ${promo.code}`,
      amountMinor: promo.amount_minor,
      refType: "promo",
      refId: promo.id,
    });

    return { amount_minor: promo.amount_minor, balance_minor: balance };
  });

  return ok(result);
});
