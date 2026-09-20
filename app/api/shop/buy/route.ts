import { bootstrap } from "@/lib/server/bootstrap";
import { getDb, now, transact } from "@/lib/server/db";
import { debit } from "@/lib/server/ledger";
import { scaleMinor } from "@/lib/server/money";
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

/** Buying outright costs more than the sell-back price. Server-side constant. */
const SHOP_PREMIUM = 1.12;

export const POST = handler(async (req: Request) => {
  bootstrap();
  const user = await requireUser();
  rateLimit(`shop:${user.id}`, 30, 10_000);

  const body = await readJson<{ skin_id?: unknown }>(req);
  const skinId = asInt(body.skin_id, "skin_id", { min: 1 });

  const result = transact(() => {
    const db = getDb();
    // Price is looked up here, inside the transaction. The request body
    // carries only an id — there is no price field to tamper with.
    const skin = db
      .prepare(
        `SELECT id, market_name, base_price_minor, stattrak_capable
           FROM skins WHERE id = ?`,
      )
      .get(skinId) as
      | {
          id: number;
          market_name: string;
          base_price_minor: number;
          stattrak_capable: number;
        }
      | undefined;

    if (!skin) throw new ApiError("not_found", "Предмет не найден");

    const cost = scaleMinor(skin.base_price_minor, SHOP_PREMIUM);

    const balance = debit({
      userId: user.id,
      kind: "shop",
      label: `Покупка — ${skin.market_name}`,
      amountMinor: cost,
      refType: "skin",
      refId: skin.id,
    });

    // A purchased item gets a mid-range float rather than a rolled one:
    // the player is paying for certainty, not gambling.
    const instance = rollInstance({
      basePriceMinor: skin.base_price_minor,
      minFloat: 0.07,
      maxFloat: 0.15,
      stattrak: false,
    });

    const ts = now();
    const inv = db
      .prepare(
        `INSERT INTO inventory_items
           (user_id, skin_id, price_minor, wear, float_value, stattrak,
            source, status, acquired_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 'shop', 'owned', ?, ?)`,
      )
      .run(
        user.id,
        skin.id,
        instance.priceMinor,
        instance.wear,
        instance.floatValue,
        ts,
        ts,
      );

    return {
      inventory_id: Number(inv.lastInsertRowid),
      cost_minor: cost,
      balance_minor: balance,
      market_name: skin.market_name,
    };
  });

  return ok(result);
});
