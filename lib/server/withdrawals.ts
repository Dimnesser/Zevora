import "server-only";

import { getDb, now, transact } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import { randomToken } from "@/lib/server/rng";

/**
 * Withdrawals.
 *
 * Previously an item sent to Steam was simply flipped to 'withdrawing'
 * and left there: no record of who asked, no way for the player to change
 * their mind, and no way for an operator to mark it done. The item was
 * frozen and the money it represented was gone from the player's reach
 * without anything having happened.
 *
 * A withdrawal is a request now. It moves through one small set of
 * states, and each transition decides what becomes of the items:
 *
 *   pending   → sent      the offer is out; items stay held
 *   sent      → completed the player accepted; items leave the inventory
 *   pending   → cancelled the player changed their mind; items return
 *   pending   → rejected  the operator refused; items return
 *
 * Returning items is the default for every unhappy path, because the
 * alternative — an item stuck in limbo — is the bug this replaces.
 */

export type WithdrawalStatus =
  | "pending"
  | "sent"
  | "completed"
  | "rejected"
  | "cancelled";

export interface WithdrawalRow {
  id: number;
  public_id: string;
  user_id: number;
  trade_url: string;
  status: WithdrawalStatus;
  item_count: number;
  value_minor: number;
  note: string | null;
  created_at: number;
  updated_at: number;
  resolved_at: number | null;
  resolved_by: number | null;
}

/** Items a request still holds, for display. */
export interface WithdrawalItem {
  id: number;
  market_name: string;
  price_minor: number;
  wear: string;
  image_url: string | null;
  rarity_slug: string;
  rarity_color: string;
}

const OPEN: WithdrawalStatus[] = ["pending", "sent"];

export function createWithdrawal(opts: {
  userId: number;
  itemIds: number[];
  tradeUrl: string;
}): { withdrawal: WithdrawalRow; queued: number } {
  if (opts.itemIds.length === 0) {
    throw new ApiError("invalid_input", "Не выбрано ни одного предмета");
  }

  return transact(() => {
    const db = getDb();
    const marks = opts.itemIds.map(() => "?").join(",");
    const ts = now();

    // Ownership and availability are part of the query, so a request
    // naming someone else's item simply finds nothing.
    const items = db
      .prepare(
        `SELECT id, price_minor FROM inventory_items
          WHERE id IN (${marks}) AND user_id = ? AND status = 'owned'`,
      )
      .all(...opts.itemIds, opts.userId) as { id: number; price_minor: number }[];

    if (items.length === 0) {
      throw new ApiError("conflict", "Предметы недоступны для вывода");
    }

    const value = items.reduce((s, i) => s + i.price_minor, 0);
    const publicId = randomToken(10);

    const inserted = db
      .prepare(
        `INSERT INTO withdrawals
           (public_id, user_id, trade_url, status, item_count, value_minor,
            created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`,
      )
      .run(publicId, opts.userId, opts.tradeUrl, items.length, value, ts, ts);

    const withdrawalId = Number(inserted.lastInsertRowid);
    const ids = items.map((i) => i.id);
    const holdMarks = ids.map(() => "?").join(",");

    db.prepare(
      `UPDATE inventory_items
          SET status = 'withdrawing', withdrawal_id = ?, updated_at = ?
        WHERE id IN (${holdMarks}) AND user_id = ? AND status = 'owned'`,
    ).run(withdrawalId, ts, ...ids, opts.userId);

    // A zero-amount entry: nothing moves on the balance, but the request
    // belongs in the account's history.
    db.prepare(
      `INSERT INTO transactions
         (user_id, kind, label, amount_minor, balance_after_minor,
          ref_type, ref_id, created_at)
       SELECT ?, 'withdraw', ?, 0, balance_minor, 'withdrawal', ?, ?
         FROM users WHERE id = ?`,
    ).run(
      opts.userId,
      `Заявка на вывод — ${items.length} предм.`,
      withdrawalId,
      ts,
      opts.userId,
    );

    return { withdrawal: byId(withdrawalId)!, queued: items.length };
  });
}

function byId(id: number): WithdrawalRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM withdrawals WHERE id = ?`)
    .get(id) as WithdrawalRow | undefined;
}

export function byPublicId(publicId: string): WithdrawalRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM withdrawals WHERE public_id = ?`)
    .get(publicId) as WithdrawalRow | undefined;
}

export function listForUser(userId: number, limit = 20): WithdrawalRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM withdrawals WHERE user_id = ?
        ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as WithdrawalRow[];
}

export function listAll(status: string | undefined, limit = 50): WithdrawalRow[] {
  const db = getDb();
  if (status && status !== "all") {
    return db
      .prepare(
        `SELECT * FROM withdrawals WHERE status = ?
          ORDER BY created_at ASC LIMIT ?`,
      )
      .all(status, limit) as WithdrawalRow[];
  }
  return db
    .prepare(
      `SELECT * FROM withdrawals
        ORDER BY (status IN ('pending','sent')) DESC, created_at DESC LIMIT ?`,
    )
    .all(limit) as WithdrawalRow[];
}

export function itemsOf(withdrawalId: number): WithdrawalItem[] {
  return getDb()
    .prepare(
      `SELECT i.id, i.price_minor, i.wear, s.market_name, s.image_url,
              r.slug AS rarity_slug, r.color AS rarity_color
         FROM inventory_items i
         JOIN skins s ON s.id = i.skin_id
         JOIN rarities r ON r.id = s.rarity_id
        WHERE i.withdrawal_id = ?
        ORDER BY i.price_minor DESC`,
    )
    .all(withdrawalId) as WithdrawalItem[];
}

/** Puts the request's items back in the player's hands. */
function releaseItems(withdrawalId: number, ts: number): void {
  getDb()
    .prepare(
      `UPDATE inventory_items
          SET status = 'owned', withdrawal_id = NULL, updated_at = ?
        WHERE withdrawal_id = ? AND status = 'withdrawing'`,
    )
    .run(ts, withdrawalId);
}

/**
 * Moves a request along. `actorId` is the operator for an admin
 * transition and the player for a cancellation; `byOwner` decides which
 * transitions are allowed.
 */
export function transition(opts: {
  publicId: string;
  to: WithdrawalStatus;
  actorId: number;
  byOwner: boolean;
  note?: string;
}): WithdrawalRow {
  return transact(() => {
    const db = getDb();
    const row = byPublicId(opts.publicId);
    if (!row) throw new ApiError("not_found", "Заявка не найдена");

    if (!opts.byOwner) {
      // A player may only withdraw their own request, and only while
      // nothing has been sent yet.
      if (row.user_id !== opts.actorId) {
        throw new ApiError("not_found", "Заявка не найдена");
      }
      if (opts.to !== "cancelled") {
        throw new ApiError("forbidden", "Статус заявки меняет оператор");
      }
      if (row.status !== "pending") {
        throw new ApiError(
          "conflict",
          row.status === "sent"
            ? "Обмен уже отправлен — отменить нельзя"
            : "Заявка уже закрыта",
        );
      }
    } else if (!OPEN.includes(row.status)) {
      throw new ApiError("conflict", "Заявка уже закрыта");
    } else if (opts.to === "completed" && row.status !== "sent") {
      throw new ApiError("conflict", "Сначала отправьте обмен");
    }

    const ts = now();
    const closing = opts.to !== "sent";

    const changed = db
      .prepare(
        `UPDATE withdrawals
            SET status = ?, note = COALESCE(?, note), updated_at = ?,
                resolved_at = ?, resolved_by = ?
          WHERE id = ? AND status = ?`,
      )
      .run(
        opts.to,
        opts.note ?? null,
        ts,
        closing ? ts : null,
        closing ? opts.actorId : null,
        row.id,
        row.status,
      );

    // Conditional on the status we read, so two operators clicking at
    // once cannot both settle the same request.
    if (changed.changes === 0) {
      throw new ApiError("conflict", "Статус заявки уже изменился");
    }

    if (opts.to === "completed") {
      db.prepare(
        `UPDATE inventory_items
            SET status = 'withdrawn', updated_at = ?
          WHERE withdrawal_id = ? AND status = 'withdrawing'`,
      ).run(ts, row.id);
    } else if (opts.to === "cancelled" || opts.to === "rejected") {
      releaseItems(row.id, ts);
    }

    return byPublicId(opts.publicId)!;
  });
}

export function publicWithdrawal(row: WithdrawalRow, items?: WithdrawalItem[]) {
  return {
    id: row.public_id,
    status: row.status,
    item_count: row.item_count,
    value_minor: row.value_minor,
    note: row.note,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    // Trade URLs carry a token; only the last part is shown back.
    trade_url_hint: row.trade_url.slice(-12),
    items: items?.map((i) => ({
      id: i.id,
      market_name: i.market_name,
      price_minor: i.price_minor,
      wear: i.wear,
      image_url: i.image_url,
      rarity: { slug: i.rarity_slug, color: i.rarity_color },
    })),
  };
}
