import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import {
  ApiError,
  asInt,
  asString,
  handler,
  ok,
  readJson,
  requireOwner,
} from "@/lib/server/http";
import { TIERS } from "@/data/partners";
import { toMinor } from "@/lib/server/money";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const TIER_KEYS = ["partner", "creator", "elite", "ambassador"] as const;

function promoFor(username: string): string {
  return `ZEV-${username.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10)}`;
}

/**
 * Grants or updates a partner status.
 *
 * Guarded by requireOwner, so partnership can only ever be handed out by
 * the platform owner — there is no self-serve path anywhere in the API.
 */
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  bootstrap();
  await requireOwner();
  const userId = asInt((await ctx.params).id, "id", { min: 1 });

  const body = await readJson<Record<string, unknown>>(req);
  const tier = asString(body.tier, "tier");
  if (!TIER_KEYS.includes(tier as (typeof TIER_KEYS)[number])) {
    throw new ApiError("invalid_input", `tier должен быть одним из: ${TIER_KEYS.join(", ")}`);
  }

  const db = getDb();
  const target = db
    .prepare(`SELECT id, username, partner_since, promo_code FROM users WHERE id = ?`)
    .get(userId) as
    | { id: number; username: string; partner_since: number | null; promo_code: string | null }
    | undefined;
  if (!target) throw new ApiError("not_found", "Пользователь не найден");

  const meta = TIERS[tier as keyof typeof TIERS];
  const ts = now();
  const promo = target.promo_code ?? promoFor(target.username);

  transact(() => {
    db.prepare(
      `UPDATE users
          SET partner_tier = ?, partner_since = ?, promo_code = ?,
              ref_code = COALESCE(ref_code, ?), partner_perks = ?,
              updated_at = ?
        WHERE id = ?`,
    ).run(
      tier,
      target.partner_since ?? ts,
      promo,
      target.username,
      JSON.stringify(meta.perks),
      ts,
      userId,
    );

    // A partner's personal promo code is a real, redeemable code.
    db.prepare(
      `INSERT INTO promo_codes (code, amount_minor, partner_user_id, is_active, created_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(code) DO UPDATE SET partner_user_id = excluded.partner_user_id,
                                       is_active = 1`,
    ).run(promo, toMinor(400), userId, ts);
  });

  return ok({ ok: true, tier, promo_code: promo });
});

/** Updates perks, promo code and bonus overrides for an existing partner. */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  bootstrap();
  await requireOwner();
  const userId = asInt((await ctx.params).id, "id", { min: 1 });

  const db = getDb();
  const target = db
    .prepare(`SELECT id, username, partner_tier FROM users WHERE id = ?`)
    .get(userId) as
    | { id: number; username: string; partner_tier: string | null }
    | undefined;
  if (!target) throw new ApiError("not_found", "Пользователь не найден");
  if (!target.partner_tier) {
    throw new ApiError("conflict", "Пользователь не является партнёром");
  }

  const body = await readJson<Record<string, unknown>>(req);
  const sets: string[] = [];
  const params: unknown[] = [];

  if (Array.isArray(body.perks)) {
    sets.push("partner_perks = ?");
    params.push(JSON.stringify(body.perks.filter((p) => typeof p === "string")));
  }
  if (Array.isArray(body.campaigns)) {
    sets.push("partner_campaigns = ?");
    params.push(JSON.stringify(body.campaigns.filter((c) => typeof c === "string")));
  }
  if (body.daily_minor !== undefined) {
    sets.push("partner_daily_minor = ?");
    params.push(asInt(body.daily_minor, "daily_minor", { min: 0, max: 100_000_000 }));
  }
  if (body.ref_multiplier !== undefined) {
    const n = Number(body.ref_multiplier);
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      throw new ApiError("invalid_input", "ref_multiplier должен быть в диапазоне 0..100");
    }
    sets.push("partner_ref_multiplier = ?");
    params.push(n);
  }

  let newPromo: string | null = null;
  if (body.promo_code !== undefined) {
    newPromo = asString(body.promo_code, "promo_code", {
      min: 3,
      max: 32,
      pattern: /^[A-Za-z0-9-]+$/,
    }).toUpperCase();
    sets.push("promo_code = ?");
    params.push(newPromo);
  }

  if (sets.length === 0) throw new ApiError("invalid_input", "Нет полей для обновления");

  sets.push("updated_at = ?");
  params.push(now(), userId);

  transact(() => {
    db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    if (newPromo) {
      db.prepare(
        `INSERT INTO promo_codes (code, amount_minor, partner_user_id, is_active, created_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(code) DO UPDATE SET partner_user_id = excluded.partner_user_id,
                                         is_active = 1`,
      ).run(newPromo, toMinor(400), userId, now());
    }
  });

  return ok({ ok: true });
});

/** Revokes the status. Earned items and balance stay with the user. */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  bootstrap();
  await requireOwner();
  const userId = asInt((await ctx.params).id, "id", { min: 1 });

  const db = getDb();
  const res = transact(() => {
    // The personal code stops paying out, but redemption history stays.
    db.prepare(
      `UPDATE promo_codes SET is_active = 0 WHERE partner_user_id = ?`,
    ).run(userId);
    return db
      .prepare(
        `UPDATE users
            SET partner_tier = NULL, partner_perks = NULL,
                partner_daily_minor = NULL, partner_ref_multiplier = NULL,
                partner_campaigns = NULL, updated_at = ?
          WHERE id = ? AND partner_tier IS NOT NULL`,
      )
      .run(now(), userId);
  });

  if (res.changes === 0) {
    throw new ApiError("conflict", "Пользователь не является партнёром");
  }
  return ok({ ok: true });
});
