import "server-only";

import { getDb, now, transact } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import { credit } from "@/lib/server/ledger";

export interface InventoryRow {
  id: number;
  skin_id: number;
  price_minor: number;
  wear: string;
  float_value: number;
  stattrak: number;
  source: string;
  status: string;
  acquired_at: number;
  market_name: string;
  weapon: string;
  finish: string;
  image_url: string | null;
  rarity_slug: string;
  rarity_name: string;
  rarity_color: string;
  rarity_effect: string;
  rarity_order: number;
  source_case_name: string | null;
  source_case_slug: string | null;
  art_kind: string;
  art_pattern: string;
  art_color_a: string;
  art_color_b: string;
}

export type InventorySort = "recent" | "price-desc" | "price-asc" | "rarity";

const ORDER_BY: Record<InventorySort, string> = {
  recent: "i.acquired_at DESC, i.id DESC",
  "price-desc": "i.price_minor DESC, i.id DESC",
  "price-asc": "i.price_minor ASC, i.id DESC",
  rarity: "r.sort_order DESC, i.price_minor DESC",
};

export function listInventory(opts: {
  userId: number;
  sort?: InventorySort;
  rarity?: string;
  limit?: number;
  offset?: number;
}): { items: InventoryRow[]; total: number; value_minor: number } {
  const db = getDb();
  const sort = ORDER_BY[opts.sort ?? "recent"] ?? ORDER_BY.recent;

  const where: string[] = ["i.user_id = ?", "i.status IN ('owned','withdrawing')"];
  const params: unknown[] = [opts.userId];
  if (opts.rarity && opts.rarity !== "all") {
    where.push("r.slug = ?");
    params.push(opts.rarity);
  }
  const whereSql = where.join(" AND ");

  const items = db
    .prepare(
      `SELECT i.id, i.skin_id, i.price_minor, i.wear, i.float_value,
              i.stattrak, i.source, i.status, i.acquired_at,
              s.market_name, s.weapon, s.finish,
              s.art_kind, s.art_pattern, s.art_color_a, s.art_color_b,
              r.slug AS rarity_slug, r.name AS rarity_name,
              r.color AS rarity_color, r.effect AS rarity_effect,
              r.sort_order AS rarity_order,
              c.name AS source_case_name, c.slug AS source_case_slug,
              (SELECT si.url FROM skin_images si
                WHERE si.skin_id = s.id AND si.is_primary = 1
                ORDER BY si.id LIMIT 1) AS image_url
         FROM inventory_items i
         JOIN skins s ON s.id = i.skin_id
         JOIN rarities r ON r.id = s.rarity_id
         LEFT JOIN cases c ON c.id = i.source_case_id
        WHERE ${whereSql}
        ORDER BY ${sort}
        LIMIT ? OFFSET ?`,
    )
    .all(...params, opts.limit ?? 200, opts.offset ?? 0) as InventoryRow[];

  const agg = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(i.price_minor), 0) AS value_minor
         FROM inventory_items i
         JOIN skins s ON s.id = i.skin_id
         JOIN rarities r ON r.id = s.rarity_id
        WHERE ${whereSql}`,
    )
    .get(...params) as { total: number; value_minor: number };

  return { items, total: agg.total, value_minor: agg.value_minor };
}

export function rarityCounts(userId: number): Record<string, number> {
  const rows = getDb()
    .prepare(
      `SELECT r.slug, COUNT(*) AS n
         FROM inventory_items i
         JOIN skins s ON s.id = i.skin_id
         JOIN rarities r ON r.id = s.rarity_id
        WHERE i.user_id = ? AND i.status IN ('owned','withdrawing')
        GROUP BY r.slug`,
    )
    .all(userId) as { slug: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.slug, r.n]));
}

/**
 * Sells owned items and credits the balance.
 *
 * The UPDATE is scoped by user_id and status, so a request naming another
 * player's item id changes nothing, and a replayed sell finds the rows
 * already in 'sold' and sells nothing.
 */
export function sellItems(
  userId: number,
  ids: number[],
): { sold: number; amount_minor: number; balance_minor: number } {
  if (ids.length === 0) {
    throw new ApiError("invalid_input", "Не выбрано ни одного предмета");
  }

  return transact(() => {
    const db = getDb();
    const placeholders = ids.map(() => "?").join(",");

    const rows = db
      .prepare(
        `SELECT i.id, i.price_minor, s.market_name
           FROM inventory_items i
           JOIN skins s ON s.id = i.skin_id
          WHERE i.id IN (${placeholders})
            AND i.user_id = ?
            AND i.status = 'owned'`,
      )
      .all(...ids, userId) as {
      id: number;
      price_minor: number;
      market_name: string;
    }[];

    if (rows.length === 0) {
      throw new ApiError("conflict", "Предметы недоступны для продажи");
    }

    const total = rows.reduce((sum, r) => sum + r.price_minor, 0);
    const ts = now();
    const soldIds = rows.map((r) => r.id);
    const soldPlaceholders = soldIds.map(() => "?").join(",");

    const res = db
      .prepare(
        `UPDATE inventory_items
            SET status = 'sold', updated_at = ?
          WHERE id IN (${soldPlaceholders})
            AND user_id = ?
            AND status = 'owned'`,
      )
      .run(ts, ...soldIds, userId);

    if (res.changes !== rows.length) {
      // Someone changed these rows between the SELECT and the UPDATE.
      throw new ApiError("conflict", "Состояние предметов изменилось, повторите");
    }

    const label =
      rows.length === 1
        ? `Продажа — ${rows[0].market_name}`
        : `Продажа ${rows.length} предм.`;

    const balance = credit({
      userId,
      kind: "sell",
      label,
      amountMinor: total,
      refType: "inventory",
      refId: soldIds[0],
    });

    return { sold: rows.length, amount_minor: total, balance_minor: balance };
  });
}

/** Marks items as awaiting withdrawal. No balance movement. */
export function withdrawItems(userId: number, ids: number[]): { queued: number } {
  if (ids.length === 0) {
    throw new ApiError("invalid_input", "Не выбрано ни одного предмета");
  }

  return transact(() => {
    const db = getDb();
    const placeholders = ids.map(() => "?").join(",");
    const ts = now();

    const res = db
      .prepare(
        `UPDATE inventory_items
            SET status = 'withdrawing', updated_at = ?
          WHERE id IN (${placeholders}) AND user_id = ? AND status = 'owned'`,
      )
      .run(ts, ...ids, userId);

    if (res.changes === 0) {
      throw new ApiError("conflict", "Предметы недоступны для вывода");
    }

    db.prepare(
      `INSERT INTO transactions
         (user_id, kind, label, amount_minor, balance_after_minor, created_at)
       SELECT ?, 'withdraw', ?, 0, balance_minor, ? FROM users WHERE id = ?`,
    ).run(userId, `Вывод ${res.changes} предм.`, ts, userId);

    return { queued: res.changes };
  });
}
