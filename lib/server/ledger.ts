import "server-only";

import { getDb, now } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";

type TxKind =
  | "deposit"
  | "withdraw"
  | "case"
  | "sell"
  | "shop"
  | "upgrade-win"
  | "upgrade-loss"
  | "bonus"
  | "promo"
  | "referral"
  | "admin";

/**
 * Appends a ledger row for a balance change that has already been applied
 * (debits) or applies a credit and appends the row (credits).
 *
 * Must be called inside a transaction. Returns the resulting balance.
 *
 * Debits are applied by the caller with a conditional UPDATE so the
 * balance check and the write are one statement; credits have no such
 * race, so they are applied here.
 */
export function recordTransaction(opts: {
  userId: number;
  kind: TxKind;
  label: string;
  /** Signed. Negative amounts are assumed already debited by the caller. */
  amountMinor: number;
  refType?: string;
  refId?: number;
  /** Set for credits that this function should apply itself. */
  applyCredit?: boolean;
}): number {
  const db = getDb();

  if (opts.applyCredit && opts.amountMinor > 0) {
    db.prepare(
      `UPDATE users SET balance_minor = balance_minor + ?, updated_at = ?
        WHERE id = ?`,
    ).run(opts.amountMinor, now(), opts.userId);
  }

  const row = db
    .prepare(`SELECT balance_minor FROM users WHERE id = ?`)
    .get(opts.userId) as { balance_minor: number } | undefined;

  if (!row) throw new ApiError("not_found", "Пользователь не найден");

  db.prepare(
    `INSERT INTO transactions
       (user_id, kind, label, amount_minor, balance_after_minor,
        ref_type, ref_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    opts.userId,
    opts.kind,
    opts.label,
    opts.amountMinor,
    row.balance_minor,
    opts.refType ?? null,
    opts.refId ?? null,
    now(),
  );

  return row.balance_minor;
}

/** Credits a balance and writes the ledger row. Call inside a transaction. */
export function credit(opts: {
  userId: number;
  kind: TxKind;
  label: string;
  amountMinor: number;
  refType?: string;
  refId?: number;
}): number {
  if (opts.amountMinor <= 0) {
    throw new ApiError("invalid_input", "Сумма зачисления должна быть больше нуля");
  }
  return recordTransaction({ ...opts, applyCredit: true });
}

/**
 * Debits a balance if it covers the amount.
 * Returns the new balance, or throws when funds are short.
 */
export function debit(opts: {
  userId: number;
  kind: TxKind;
  label: string;
  amountMinor: number;
  refType?: string;
  refId?: number;
}): number {
  if (opts.amountMinor <= 0) {
    throw new ApiError("invalid_input", "Сумма списания должна быть больше нуля");
  }
  const res = getDb()
    .prepare(
      `UPDATE users SET balance_minor = balance_minor - ?, updated_at = ?
        WHERE id = ? AND balance_minor >= ?`,
    )
    .run(opts.amountMinor, now(), opts.userId, opts.amountMinor);

  if (res.changes === 0) {
    throw new ApiError("insufficient_funds", "Недостаточно средств на балансе");
  }

  return recordTransaction({ ...opts, amountMinor: -opts.amountMinor });
}
