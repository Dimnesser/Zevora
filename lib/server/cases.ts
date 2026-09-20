import "server-only";

import { getDb, now, transact } from "@/lib/server/db";
import { drawWeighted } from "@/lib/server/rng";
import { rollInstance, STATTRAK_CHANCE } from "@/lib/server/wear";
import { chance } from "@/lib/server/rng";
import { ApiError } from "@/lib/server/http";
import { recordTransaction } from "@/lib/server/ledger";
import type { AuthUser } from "@/lib/server/auth";

export interface CaseRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  price_minor: number;
  is_active: number;
  is_demo: number;
  partner_only: number;
  tags: string;
  art_emblem: string;
  art_color_a: string;
  art_color_b: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface CaseItemRow {
  id: number;
  case_id: number;
  skin_id: number;
  weight: number;
  min_float: number;
  max_float: number;
  stattrak_enabled: number;
  sort_order: number;
}

export interface CaseItemDetail extends CaseItemRow {
  market_name: string;
  weapon: string;
  finish: string;
  base_price_minor: number;
  stattrak_capable: number;
  art_kind: string;
  art_pattern: string;
  art_color_a: string;
  art_color_b: string;
  rarity_slug: string;
  rarity_name: string;
  rarity_color: string;
  rarity_effect: string;
  rarity_order: number;
  image_url: string | null;
  /** weight / total, computed server-side and shown before opening. */
  chance: number;
}

/* ───────────────────────── reads ───────────────────────── */

export function listCases(opts: { includeInactive?: boolean; partner?: boolean } = {}) {
  const db = getDb();
  const conditions: string[] = [];
  if (!opts.includeInactive) conditions.push("c.is_active = 1");
  if (!opts.partner && !opts.includeInactive) conditions.push("c.partner_only = 0");
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM case_items ci WHERE ci.case_id = c.id) AS item_count,
              (SELECT MAX(s.base_price_minor)
                 FROM case_items ci JOIN skins s ON s.id = ci.skin_id
                WHERE ci.case_id = c.id) AS best_price_minor
         FROM cases c
         ${where}
        ORDER BY c.sort_order ASC, c.id ASC`,
    )
    .all() as (CaseRow & { item_count: number; best_price_minor: number | null })[];
}

export function getCaseBySlug(slug: string): CaseRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM cases WHERE slug = ?`)
      .get(slug) as CaseRow | undefined) ?? null
  );
}

export function getCaseById(id: number): CaseRow | null {
  return (
    (getDb().prepare(`SELECT * FROM cases WHERE id = ?`).get(id) as
      | CaseRow
      | undefined) ?? null
  );
}

/**
 * Full drop table with true probabilities.
 *
 * The same query backs both the public case page and the roll, so the
 * odds a player is shown are literally the odds that are drawn from.
 */
export function getCaseItems(caseId: number): CaseItemDetail[] {
  const rows = getDb()
    .prepare(
      `SELECT ci.*,
              s.market_name, s.weapon, s.finish, s.base_price_minor,
              s.stattrak_capable, s.art_kind, s.art_pattern,
              s.art_color_a, s.art_color_b,
              r.slug AS rarity_slug, r.name AS rarity_name,
              r.color AS rarity_color, r.effect AS rarity_effect,
              r.sort_order AS rarity_order,
              s.image_url
         FROM case_items ci
         JOIN skins s ON s.id = ci.skin_id
         JOIN rarities r ON r.id = s.rarity_id
        WHERE ci.case_id = ?
        ORDER BY r.sort_order DESC, s.base_price_minor DESC`,
    )
    .all(caseId) as Omit<CaseItemDetail, "chance">[];

  const total = rows.reduce((sum, r) => sum + r.weight, 0);
  return rows.map((r) => ({ ...r, chance: total > 0 ? r.weight / total : 0 }));
}

/* ───────────────────────── the opening ───────────────────────── */

export interface OpenResult {
  opening_id: number;
  case: { slug: string; name: string; price_minor: number };
  item: {
    inventory_id: number;
    skin_id: number;
    market_name: string;
    weapon: string;
    finish: string;
    wear: string;
    float_value: number;
    stattrak: boolean;
    price_minor: number;
    image_url: string | null;
    rarity: { slug: string; name: string; color: string; effect: string };
    art: { kind: string; pattern: string; color_a: string; color_b: string };
  };
  balance_minor: number;
  /** Audit fields, safe to expose: they prove the draw after the fact. */
  audit: { roll: number; total_weight: number };
}

/**
 * Opens one case, atomically.
 *
 * Everything below runs inside a single IMMEDIATE transaction: the
 * balance check, the debit, the draw, the inventory write and the ledger
 * entry either all land or none do. The price is read from the database
 * inside the transaction, so a client-supplied price is impossible —
 * there is no parameter for one.
 */
export function openCase(
  user: AuthUser,
  slug: string,
  idempotencyKey: string,
): OpenResult {
  const db = getDb();

  return transact(() => {
    // Replay protection. The PRIMARY KEY makes this the serialization
    // point: a duplicate request loses the insert and replays the
    // original response instead of paying again.
    const existing = db
      .prepare(
        `SELECT response_json FROM idempotency_keys
          WHERE key = ? AND user_id = ?`,
      )
      .get(idempotencyKey, user.id) as { response_json: string } | undefined;

    if (existing) {
      return JSON.parse(existing.response_json) as OpenResult;
    }

    const kase = db.prepare(`SELECT * FROM cases WHERE slug = ?`).get(slug) as
      | CaseRow
      | undefined;

    if (!kase) throw new ApiError("not_found", "Кейс не найден");
    if (!kase.is_active) {
      throw new ApiError("conflict", "Кейс временно недоступен");
    }
    if (kase.partner_only && !user.partner_tier) {
      throw new ApiError("forbidden", "Кейс доступен только партнёрам Zevora");
    }

    // Authoritative price. Never trust anything the client sent.
    const price = kase.price_minor;

    if (price > 0) {
      // Conditional debit: the WHERE clause re-checks the balance at write
      // time, so two racing requests cannot both pass a prior read.
      const debit = db
        .prepare(
          `UPDATE users
              SET balance_minor = balance_minor - ?, updated_at = ?
            WHERE id = ? AND balance_minor >= ?`,
        )
        .run(price, now(), user.id, price);

      if (debit.changes === 0) {
        throw new ApiError("insufficient_funds", "Недостаточно средств на балансе");
      }
    }

    const pool = db
      .prepare(
        `SELECT ci.id, ci.skin_id, ci.weight, ci.min_float, ci.max_float,
                ci.stattrak_enabled,
                s.market_name, s.weapon, s.finish, s.base_price_minor,
                s.stattrak_capable, s.art_kind, s.art_pattern,
                s.art_color_a, s.art_color_b,
                r.slug AS rarity_slug, r.name AS rarity_name,
                r.color AS rarity_color, r.effect AS rarity_effect
           FROM case_items ci
           JOIN skins s ON s.id = ci.skin_id
           JOIN rarities r ON r.id = s.rarity_id
          WHERE ci.case_id = ?
          ORDER BY ci.id`,
      )
      .all(kase.id) as (CaseItemRow & {
      market_name: string;
      weapon: string;
      finish: string;
      base_price_minor: number;
      stattrak_capable: number;
      art_kind: string;
      art_pattern: string;
      art_color_a: string;
      art_color_b: string;
      rarity_slug: string;
      rarity_name: string;
      rarity_color: string;
      rarity_effect: string;
    })[];

    if (pool.length === 0) {
      throw new ApiError("conflict", "Кейс пуст");
    }

    // The draw. Cryptographic, unbiased, and recorded.
    const { item: won, roll, totalWeight } = drawWeighted(pool);

    const stattrak =
      won.stattrak_capable === 1 &&
      won.stattrak_enabled === 1 &&
      chance(STATTRAK_CHANCE);

    const instance = rollInstance({
      basePriceMinor: won.base_price_minor,
      minFloat: won.min_float,
      maxFloat: won.max_float,
      stattrak,
    });

    const ts = now();

    const inv = db
      .prepare(
        `INSERT INTO inventory_items
           (user_id, skin_id, price_minor, wear, float_value, stattrak,
            source, source_case_id, status, acquired_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'case', ?, 'owned', ?, ?)`,
      )
      .run(
        user.id,
        won.skin_id,
        instance.priceMinor,
        instance.wear,
        instance.floatValue,
        stattrak ? 1 : 0,
        kase.id,
        ts,
        ts,
      );

    const inventoryId = Number(inv.lastInsertRowid);

    const opening = db
      .prepare(
        `INSERT INTO case_openings
           (user_id, case_id, skin_id, inventory_item_id, price_paid_minor,
            value_minor, roll, total_weight, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.id,
        kase.id,
        won.skin_id,
        inventoryId,
        price,
        instance.priceMinor,
        roll,
        totalWeight,
        ts,
      );

    const balanceAfter = recordTransaction({
      userId: user.id,
      kind: "case",
      label: `${kase.name} → ${won.market_name}`,
      amountMinor: -price,
      refType: "case_opening",
      refId: Number(opening.lastInsertRowid),
    });

    db.prepare(
      `UPDATE users SET xp = xp + 40, updated_at = ? WHERE id = ?`,
    ).run(ts, user.id);

    const image = db
      .prepare(`SELECT image_url AS url FROM skins WHERE id = ?`)
      .get(won.skin_id) as { url: string | null } | undefined;

    const result: OpenResult = {
      opening_id: Number(opening.lastInsertRowid),
      case: { slug: kase.slug, name: kase.name, price_minor: price },
      item: {
        inventory_id: inventoryId,
        skin_id: won.skin_id,
        market_name: won.market_name,
        weapon: won.weapon,
        finish: won.finish,
        wear: instance.wear,
        float_value: instance.floatValue,
        stattrak,
        price_minor: instance.priceMinor,
        image_url: image?.url ?? null,
        rarity: {
          slug: won.rarity_slug,
          name: won.rarity_name,
          color: won.rarity_color,
          effect: won.rarity_effect,
        },
        art: {
          kind: won.art_kind,
          pattern: won.art_pattern,
          color_a: won.art_color_a,
          color_b: won.art_color_b,
        },
      },
      balance_minor: balanceAfter,
      audit: { roll, total_weight: totalWeight },
    };

    db.prepare(
      `INSERT INTO idempotency_keys (user_id, key, endpoint, response_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(user.id, idempotencyKey, `open:${slug}`, JSON.stringify(result), ts);

    return result;
  });
}
