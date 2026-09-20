import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { recordTransaction } from "@/lib/server/ledger";
import { randomFloatBetween } from "@/lib/server/rng";
import { rollInstance } from "@/lib/server/wear";
import {
  ApiError,
  asInt,
  handler,
  ok,
  rateLimit,
  readJson,
  requireUser,
} from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Upgrade odds. Kept server-side so the client cannot widen them.
 * chance = (stake / target) * HOUSE_EDGE, clamped.
 */
const HOUSE_EDGE = 0.92;
const MIN_CHANCE = 0.01;
const MAX_CHANCE = 0.85;
const MAX_STAKE_ITEMS = 5;

export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  rateLimit(`upgrade:${user.id}`, 30, 10_000);

  const body = await readJson<{ item_ids?: unknown; target_skin_id?: unknown }>(req);
  const targetId = asInt(body.target_skin_id, "target_skin_id", { min: 1 });

  if (!Array.isArray(body.item_ids) || body.item_ids.length === 0) {
    throw new ApiError("invalid_input", "Выберите предметы для ставки");
  }
  if (body.item_ids.length > MAX_STAKE_ITEMS) {
    throw new ApiError("invalid_input", `Максимум ${MAX_STAKE_ITEMS} предметов в ставке`);
  }
  const itemIds = body.item_ids.map((v) => asInt(v, "item_ids", { min: 1 }));

  const result = transact(() => {
    const db = getDb();
    const placeholders = itemIds.map(() => "?").join(",");

    // Ownership and status are checked in the query, so staking someone
    // else's item simply finds nothing.
    const staked = db
      .prepare(
        `SELECT id, price_minor FROM inventory_items
          WHERE id IN (${placeholders}) AND user_id = ? AND status = 'owned'`,
      )
      .all(...itemIds, user.id) as { id: number; price_minor: number }[];

    if (staked.length !== itemIds.length) {
      throw new ApiError("conflict", "Некоторые предметы недоступны");
    }

    const target = db
      .prepare(
        `SELECT id, market_name, base_price_minor FROM skins WHERE id = ?`,
      )
      .get(targetId) as
      | { id: number; market_name: string; base_price_minor: number }
      | undefined;
    if (!target) throw new ApiError("not_found", "Целевой предмет не найден");

    const stakeValue = staked.reduce((s, i) => s + i.price_minor, 0);
    if (target.base_price_minor <= stakeValue) {
      throw new ApiError(
        "invalid_input",
        "Цель должна быть дороже ставки",
      );
    }

    const chanceValue = Math.min(
      MAX_CHANCE,
      Math.max(MIN_CHANCE, (stakeValue / target.base_price_minor) * HOUSE_EDGE),
    );

    // The draw happens here, on the server, before anything is animated.
    const roll = randomFloatBetween(0, 1);
    const success = roll < chanceValue;
    const ts = now();

    // The stake is consumed either way.
    db.prepare(
      `UPDATE inventory_items SET status = 'consumed', updated_at = ?
        WHERE id IN (${placeholders}) AND user_id = ? AND status = 'owned'`,
    ).run(ts, ...itemIds, user.id);

    let wonId: number | null = null;
    let wonPrice = 0;
    let wear = "";
    let floatValue = 0;

    if (success) {
      const instance = rollInstance({
        basePriceMinor: target.base_price_minor,
        minFloat: 0,
        maxFloat: 0.38,
        stattrak: false,
      });
      wonPrice = instance.priceMinor;
      wear = instance.wear;
      floatValue = instance.floatValue;

      const inv = db
        .prepare(
          `INSERT INTO inventory_items
             (user_id, skin_id, price_minor, wear, float_value, stattrak,
              source, status, acquired_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, 'upgrade', 'owned', ?, ?)`,
        )
        .run(user.id, target.id, wonPrice, wear, floatValue, ts, ts);
      wonId = Number(inv.lastInsertRowid);
    }

    recordTransaction({
      userId: user.id,
      kind: success ? "upgrade-win" : "upgrade-loss",
      label: success
        ? `Апгрейд удался — ${target.market_name}`
        : `Апгрейд не удался — ${staked.length} предм.`,
      amountMinor: success ? wonPrice - stakeValue : -stakeValue,
      refType: "upgrade",
      refId: wonId ?? undefined,
    });

    db.prepare(`UPDATE users SET xp = xp + 60, updated_at = ? WHERE id = ?`).run(
      ts,
      user.id,
    );

    return {
      success,
      chance: chanceValue,
      roll,
      stake_minor: stakeValue,
      target: { skin_id: target.id, market_name: target.market_name },
      won: success
        ? { inventory_id: wonId, price_minor: wonPrice, wear, float_value: floatValue }
        : null,
    };
  });

  return ok(result);
});
