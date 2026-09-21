import "server-only";

import { getDb, now, transact } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import { scaleMinor } from "@/lib/server/money";
import { drawWeighted } from "@/lib/server/rng";
import { STATTRAK_MULTIPLIER, wearForFloat } from "@/lib/server/wear";

/**
 * Trade-up contracts.
 *
 * The CS2 mechanic, kept honest: ten items of one rarity go in, one item
 * of the next rarity comes out. Two rules make it a game of skill rather
 * than a slot machine, and both are implemented here rather than
 * approximated —
 *
 *   • the outcome is drawn from the *collections* the inputs came from,
 *     so what you feed the contract decides what you can get out of it;
 *   • the output's float is the average of the inputs', mapped into the
 *     output skin's own float window, so ten Factory New inputs really do
 *     produce a better item than ten Battle-Scarred ones.
 *
 * A case is this project's collection. Every draw is server-side and the
 * ticket is stored, exactly as case openings are, so a contract can be
 * re-verified after the fact.
 */

/** Ten, as in the game. */
export const CONTRACT_SIZE = 10;

/** Weight budget per collection, divided among its outcomes. */
const COLLECTION_TICKETS = 1_000_000;

export interface ContractGroup {
  rarity: { slug: string; name: string; color: string; sort_order: number };
  next: { slug: string; name: string; color: string };
  /** Owned items of this rarity. */
  owned: number;
  /** Distinct skins the next tier can yield from the cases you hold. */
  outcomes: number;
}

interface LadderRow {
  id: number;
  slug: string;
  name: string;
  color: string;
  sort_order: number;
}

/** The rarity above `sortOrder` that actually has skins behind it. */
function nextRarity(sortOrder: number): LadderRow | undefined {
  return getDb()
    .prepare(
      `SELECT r.id, r.slug, r.name, r.color, r.sort_order
         FROM rarities r
        WHERE r.sort_order > ?
          AND EXISTS (SELECT 1 FROM skins s WHERE s.rarity_id = r.id)
        ORDER BY r.sort_order ASC
        LIMIT 1`,
    )
    .get(sortOrder) as LadderRow | undefined;
}

/**
 * Which rarities this player could run a contract with.
 *
 * Every rarity they own is listed, not only the ones already at ten, so
 * the page can show how far off each one is instead of an empty screen.
 */
export function contractGroups(userId: number): ContractGroup[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.slug, r.name, r.color, r.sort_order, COUNT(*) AS owned
         FROM inventory_items i
         JOIN skins s ON s.id = i.skin_id
         JOIN rarities r ON r.id = s.rarity_id
        WHERE i.user_id = ? AND i.status = 'owned'
        GROUP BY r.id
        ORDER BY r.sort_order ASC`,
    )
    .all(userId) as (LadderRow & { owned: number })[];

  const groups: ContractGroup[] = [];
  for (const row of rows) {
    const next = nextRarity(row.sort_order);
    if (!next) continue; // top of the ladder — nothing to trade up into
    groups.push({
      rarity: {
        slug: row.slug,
        name: row.name,
        color: row.color,
        sort_order: row.sort_order,
      },
      next: { slug: next.slug, name: next.name, color: next.color },
      owned: row.owned,
      outcomes: (
        db
          .prepare(
            `SELECT COUNT(DISTINCT ci.skin_id) AS n
               FROM case_items ci
               JOIN skins s ON s.id = ci.skin_id
              WHERE s.rarity_id = ?`,
          )
          .get(next.id) as { n: number }
      ).n,
    });
  }
  return groups;
}

interface StakedRow {
  id: number;
  skin_id: number;
  float_value: number;
  stattrak: number;
  price_minor: number;
  source_case_id: number | null;
  rarity_id: number;
  rarity_sort: number;
  market_name: string;
}

interface OutcomeRow {
  skin_id: number;
  case_id: number;
  market_name: string;
  base_price_minor: number;
  stattrak_capable: number;
  min_float: number;
  max_float: number;
  weight: number;
}

export interface ContractResult {
  contract_id: number;
  consumed: number;
  stake_minor: number;
  average_float: number;
  rarity: { slug: string; name: string };
  won: {
    inventory_id: number;
    skin_id: number;
    market_name: string;
    price_minor: number;
    wear: string;
    float_value: number;
    stattrak: boolean;
  };
  pool_size: number;
  audit: { roll: number; total_weight: number };
}

/**
 * Runs one contract. Everything — validation, the draw and the write —
 * happens inside a single immediate transaction, so a double-submitted
 * contract finds its inputs already consumed and fails rather than
 * minting a second item.
 */
export function runContract(userId: number, itemIds: number[]): ContractResult {
  if (itemIds.length !== CONTRACT_SIZE) {
    throw new ApiError(
      "invalid_input",
      `В контракт нужно ровно ${CONTRACT_SIZE} предметов`,
    );
  }
  if (new Set(itemIds).size !== itemIds.length) {
    throw new ApiError("invalid_input", "Предмет нельзя использовать дважды");
  }

  return transact(() => {
    const db = getDb();
    const marks = itemIds.map(() => "?").join(",");

    // Ownership is part of the query: another player's item simply is
    // not found, and the count check below rejects the request.
    const staked = db
      .prepare(
        `SELECT i.id, i.skin_id, i.float_value, i.stattrak, i.price_minor,
                i.source_case_id, s.rarity_id, s.market_name,
                r.sort_order AS rarity_sort
           FROM inventory_items i
           JOIN skins s ON s.id = i.skin_id
           JOIN rarities r ON r.id = s.rarity_id
          WHERE i.id IN (${marks}) AND i.user_id = ? AND i.status = 'owned'`,
      )
      .all(...itemIds, userId) as StakedRow[];

    if (staked.length !== CONTRACT_SIZE) {
      throw new ApiError("conflict", "Некоторые предметы недоступны");
    }

    const rarityId = staked[0].rarity_id;
    if (staked.some((s) => s.rarity_id !== rarityId)) {
      throw new ApiError("invalid_input", "Все предметы должны быть одной редкости");
    }

    const from = db
      .prepare(`SELECT id, slug, name, color, sort_order FROM rarities WHERE id = ?`)
      .get(rarityId) as LadderRow;
    const to = nextRarity(from.sort_order);
    if (!to) {
      throw new ApiError("invalid_input", "Выше этой редкости подниматься некуда");
    }

    // ── the outcome pool ──
    // Each input contributes its collection. A collection is the case the
    // item came from; an item with no case behind it (a bonus, a shop
    // purchase) falls back to the cases that list its skin, so it still
    // carries weight instead of silently contributing nothing.
    const tickets = new Map<number, number>(); // case_id → inputs behind it
    for (const item of staked) {
      const cases =
        item.source_case_id !== null
          ? [item.source_case_id]
          : (
              db
                .prepare(`SELECT case_id FROM case_items WHERE skin_id = ?`)
                .all(item.skin_id) as { case_id: number }[]
            ).map((r) => r.case_id);
      for (const id of cases) tickets.set(id, (tickets.get(id) ?? 0) + 1);
    }

    const pool: OutcomeRow[] = [];
    for (const [caseId, count] of tickets) {
      const outcomes = db
        .prepare(
          `SELECT ci.skin_id, ci.case_id, ci.min_float, ci.max_float,
                  s.market_name, s.base_price_minor, s.stattrak_capable
             FROM case_items ci
             JOIN skins s ON s.id = ci.skin_id
            WHERE ci.case_id = ? AND s.rarity_id = ?`,
        )
        .all(caseId, to.id) as Omit<OutcomeRow, "weight">[];
      if (outcomes.length === 0) continue;

      // The collection's tickets are split evenly among its outcomes, so
      // feeding a case with two rare skins doubles your odds on each.
      const share = Math.max(1, Math.floor(COLLECTION_TICKETS / outcomes.length));
      for (const row of outcomes) pool.push({ ...row, weight: count * share });
    }

    if (pool.length === 0) {
      throw new ApiError(
        "invalid_input",
        `Из этих предметов нельзя собрать контракт: в их кейсах нет предметов редкости «${to.name}»`,
      );
    }

    // ── the draw ──
    const draw = drawWeighted(pool);
    const target = draw.item;

    // CS2's float formula, unchanged: the average of what went in,
    // mapped into what the output can be.
    const avgFloat =
      staked.reduce((sum, i) => sum + i.float_value, 0) / staked.length;
    const floatValue = Number(
      (avgFloat * (target.max_float - target.min_float) + target.min_float).toFixed(4),
    );
    const tier = wearForFloat(floatValue);

    // StatTrak survives a contract only if every input carried it.
    const stattrak =
      target.stattrak_capable === 1 && staked.every((i) => i.stattrak === 1);

    let priceMinor = scaleMinor(target.base_price_minor, tier.multiplier);
    if (stattrak) priceMinor = scaleMinor(priceMinor, STATTRAK_MULTIPLIER);
    priceMinor = Math.max(1, priceMinor);

    const stakeMinor = staked.reduce((sum, i) => sum + i.price_minor, 0);
    const ts = now();

    // ── the write ──
    db.prepare(
      `UPDATE inventory_items SET status = 'consumed', updated_at = ?
        WHERE id IN (${marks}) AND user_id = ? AND status = 'owned'`,
    ).run(ts, ...itemIds, userId);

    const inserted = db
      .prepare(
        `INSERT INTO inventory_items
           (user_id, skin_id, price_minor, wear, float_value, stattrak,
            source, source_case_id, status, acquired_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'contract', ?, 'owned', ?, ?)`,
      )
      .run(
        userId,
        target.skin_id,
        priceMinor,
        tier.wear,
        floatValue,
        stattrak ? 1 : 0,
        target.case_id,
        ts,
        ts,
      );
    const inventoryId = Number(inserted.lastInsertRowid);

    const contract = db
      .prepare(
        `INSERT INTO contracts
           (user_id, from_rarity_id, to_rarity_id, input_count, stake_minor,
            average_float, result_skin_id, result_inventory_id, value_minor,
            roll, total_weight, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        from.id,
        to.id,
        staked.length,
        stakeMinor,
        Number(avgFloat.toFixed(4)),
        target.skin_id,
        inventoryId,
        priceMinor,
        draw.roll,
        draw.totalWeight,
        ts,
      );

    const contractId = Number(contract.lastInsertRowid);
    const input = db.prepare(
      `INSERT INTO contract_inputs (contract_id, skin_id, price_minor, float_value)
       VALUES (?, ?, ?, ?)`,
    );
    for (const item of staked) {
      input.run(contractId, item.skin_id, item.price_minor, item.float_value);
    }

    db.prepare(`UPDATE users SET xp = xp + 80, updated_at = ? WHERE id = ?`).run(
      ts,
      userId,
    );

    return {
      contract_id: contractId,
      consumed: staked.length,
      stake_minor: stakeMinor,
      average_float: Number(avgFloat.toFixed(4)),
      rarity: { slug: from.slug, name: from.name },
      won: {
        inventory_id: inventoryId,
        skin_id: target.skin_id,
        market_name: target.market_name,
        price_minor: priceMinor,
        wear: tier.wear,
        float_value: floatValue,
        stattrak,
      },
      pool_size: pool.length,
      audit: { roll: draw.roll, total_weight: draw.totalWeight },
    };
  });
}
