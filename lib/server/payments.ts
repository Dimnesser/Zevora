import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb, now, transact } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import { credit } from "@/lib/server/ledger";
import { toMinor } from "@/lib/server/money";
import { randomToken } from "@/lib/server/rng";

/**
 * Top-ups.
 *
 * The rule this module exists to enforce: **the balance moves only when a
 * payment provider says the money arrived.** Before this, `/api/wallet/deposit`
 * credited the account directly, so anyone with a session could mint
 * currency by calling it in a loop — the balance was a number the client
 * could ask to be increased.
 *
 * A top-up is now an order. The client creates one and is sent to the
 * provider; the provider later reports the outcome to a webhook, which is
 * the only path that credits. Settlement is idempotent on the provider's
 * own payment id, so a webhook delivered three times credits once.
 *
 * Adding a real provider means implementing `PaymentProvider` and naming
 * it in ZEVORA_PAYMENT_PROVIDER. Nothing else in the application changes.
 */

export type OrderStatus = "pending" | "paid" | "failed" | "expired" | "cancelled";

export interface PaymentOrder {
  id: number;
  public_id: string;
  user_id: number;
  provider: string;
  method: string;
  amount_minor: number;
  bonus_minor: number;
  credited_minor: number;
  status: OrderStatus;
  provider_ref: string | null;
  failure_reason: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number;
  credited_at: number | null;
}

export interface PaymentProvider {
  id: string;
  name: string;
  /**
   * Starts a payment and returns where to send the customer. A real
   * provider calls its own API here and stores the reference it returns.
   */
  checkout(order: PaymentOrder): Promise<{ pay_url: string; provider_ref?: string }>;
  /**
   * Turns a webhook request into a settlement instruction, or throws if
   * the request is not authentic. Signature verification belongs here and
   * nowhere else.
   */
  parseWebhook(raw: string, headers: Headers): {
    public_id: string;
    provider_ref: string;
    status: "paid" | "failed";
    amount_minor: number;
    failure_reason?: string;
  };
}

/** Payment methods and the bonus each carries. Server-side, always. */
export const METHODS: Record<string, { name: string; bonus: number }> = {
  card: { name: "Банковская карта", bonus: 0 },
  sbp: { name: "СБП", bonus: 0.03 },
  crypto: { name: "Криптовалюта", bonus: 0.07 },
};

export const MIN_MAJOR = 100;
export const MAX_MAJOR = 300_000;
/** An unpaid order stops being payable after this long. */
const TTL_MS = 30 * 60_000;

/**
 * The provider bundled with the project.
 *
 * It does not move money: it hands back a local page that stands in for
 * the provider's checkout, and signs its callbacks with the same HMAC a
 * real integration would verify. Its purpose is to exercise the whole
 * order → confirmation → credit path, so that swapping in a real acquirer
 * is a matter of credentials rather than of rewriting the wallet.
 */
const mockProvider: PaymentProvider = {
  id: "mock",
  name: "Тестовый провайдер",

  async checkout(order) {
    return {
      pay_url: `/wallet/pay/${order.public_id}`,
      provider_ref: `mock_${order.public_id}`,
    };
  },

  parseWebhook(raw, headers) {
    const signature = headers.get("x-zevora-signature") ?? "";
    const expected = signPayload(raw);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ApiError("forbidden", "Подпись вебхука неверна");
    }
    const body = JSON.parse(raw) as {
      public_id?: string;
      provider_ref?: string;
      status?: string;
      amount_minor?: number;
      failure_reason?: string;
    };
    if (!body.public_id || !body.provider_ref) {
      throw new ApiError("invalid_input", "В вебхуке нет идентификатора платежа");
    }
    if (body.status !== "paid" && body.status !== "failed") {
      throw new ApiError("invalid_input", "Неизвестный статус платежа");
    }
    return {
      public_id: body.public_id,
      provider_ref: body.provider_ref,
      status: body.status,
      amount_minor: Number(body.amount_minor ?? 0),
      failure_reason: body.failure_reason,
    };
  },
};

const PROVIDERS: Record<string, PaymentProvider> = { mock: mockProvider };

/** The shared secret a provider signs its callbacks with. */
export function webhookSecret(): string {
  return process.env.ZEVORA_PAYMENT_SECRET ?? "zevora-dev-secret";
}

export function signPayload(raw: string): string {
  return createHmac("sha256", webhookSecret()).update(raw).digest("hex");
}

export function activeProvider(): PaymentProvider {
  const id = process.env.ZEVORA_PAYMENT_PROVIDER ?? "mock";
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new ApiError("server_error", `Платёжный провайдер «${id}» не настроен`);
  }
  return provider;
}

/** True when payments are simulated, which the UI must say out loud. */
export const isSimulated = () => activeProvider().id === "mock";

/* ─────────────── orders ─────────────── */

export function getOrder(publicId: string): PaymentOrder | undefined {
  return getDb()
    .prepare(`SELECT * FROM payment_orders WHERE public_id = ?`)
    .get(publicId) as PaymentOrder | undefined;
}

export function listOrders(userId: number, limit = 20): PaymentOrder[] {
  return getDb()
    .prepare(
      `SELECT * FROM payment_orders WHERE user_id = ?
        ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as PaymentOrder[];
}

export async function createOrder(opts: {
  userId: number;
  amountMajor: number;
  method: string;
}): Promise<{ order: PaymentOrder; pay_url: string }> {
  const method = METHODS[opts.method];
  if (!method) throw new ApiError("invalid_input", "Неизвестный способ оплаты");
  if (
    !Number.isInteger(opts.amountMajor) ||
    opts.amountMajor < MIN_MAJOR ||
    opts.amountMajor > MAX_MAJOR
  ) {
    throw new ApiError("invalid_input", "Сумма вне допустимых границ");
  }

  const provider = activeProvider();
  const base = toMinor(opts.amountMajor);
  const bonus = Math.round(base * method.bonus);
  const ts = now();
  const publicId = randomToken(12);

  const db = getDb();
  db.prepare(
    `INSERT INTO payment_orders
       (public_id, user_id, provider, method, amount_minor, bonus_minor,
        status, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
  ).run(
    publicId,
    opts.userId,
    provider.id,
    opts.method,
    base,
    bonus,
    ts,
    ts,
    ts + TTL_MS,
  );

  const order = getOrder(publicId)!;
  const checkout = await provider.checkout(order);

  if (checkout.provider_ref) {
    db.prepare(
      `UPDATE payment_orders SET provider_ref = ?, updated_at = ? WHERE id = ?`,
    ).run(checkout.provider_ref, now(), order.id);
  }

  return { order: getOrder(publicId)!, pay_url: checkout.pay_url };
}

/**
 * Applies a provider's verdict to an order.
 *
 * Idempotent by construction: the credit happens inside the same
 * transaction as the status change, and the change is conditional on the
 * order still being pending. A webhook delivered twice — which every
 * provider does eventually — finds the row already settled and credits
 * nothing.
 */
export function settleOrder(opts: {
  publicId: string;
  status: "paid" | "failed";
  providerRef?: string;
  failureReason?: string;
  /** What the provider says it collected, checked against the order. */
  amountMinor?: number;
}): { order: PaymentOrder; credited: boolean; balance_minor: number | null } {
  return transact(() => {
    const db = getDb();
    const order = getOrder(opts.publicId);
    if (!order) throw new ApiError("not_found", "Заказ не найден");

    if (order.status !== "pending") {
      // Already settled: report the stored outcome rather than redoing it.
      return { order, credited: false, balance_minor: null };
    }

    const ts = now();

    if (opts.status === "failed") {
      db.prepare(
        `UPDATE payment_orders
            SET status = 'failed', failure_reason = ?, provider_ref = COALESCE(?, provider_ref),
                updated_at = ?
          WHERE id = ? AND status = 'pending'`,
      ).run(opts.failureReason ?? "Платёж отклонён", opts.providerRef ?? null, ts, order.id);
      return { order: getOrder(opts.publicId)!, credited: false, balance_minor: null };
    }

    if (ts > order.expires_at) {
      db.prepare(
        `UPDATE payment_orders SET status = 'expired', updated_at = ?
          WHERE id = ? AND status = 'pending'`,
      ).run(ts, order.id);
      throw new ApiError("conflict", "Срок оплаты заказа истёк");
    }

    // The amount is the order's, never the callback's: a provider that
    // reports a different sum has a problem the balance must not inherit.
    if (
      opts.amountMinor !== undefined &&
      opts.amountMinor > 0 &&
      opts.amountMinor !== order.amount_minor
    ) {
      db.prepare(
        `UPDATE payment_orders
            SET status = 'failed', failure_reason = ?, updated_at = ?
          WHERE id = ? AND status = 'pending'`,
      ).run("Сумма платежа не совпала с заказом", ts, order.id);
      throw new ApiError("conflict", "Сумма платежа не совпала с заказом");
    }

    const total = order.amount_minor + order.bonus_minor;
    const methodName = METHODS[order.method]?.name ?? order.method;

    const changed = db
      .prepare(
        `UPDATE payment_orders
            SET status = 'paid', credited_minor = ?, credited_at = ?,
                provider_ref = COALESCE(?, provider_ref), updated_at = ?
          WHERE id = ? AND status = 'pending'`,
      )
      .run(total, ts, opts.providerRef ?? null, ts, order.id);

    // The conditional UPDATE is the serialization point: if another
    // delivery won the race, this one credits nothing.
    if (changed.changes === 0) {
      return { order: getOrder(opts.publicId)!, credited: false, balance_minor: null };
    }

    const balance = credit({
      userId: order.user_id,
      kind: "deposit",
      label: `Пополнение — ${methodName}${order.bonus_minor > 0 ? " (с бонусом)" : ""}`,
      amountMinor: total,
      refType: "payment_order",
      refId: order.id,
    });

    return { order: getOrder(opts.publicId)!, credited: true, balance_minor: balance };
  });
}

/** Marks orders nobody paid, so a stale one cannot be settled later. */
export function expireStaleOrders(): number {
  const res = getDb()
    .prepare(
      `UPDATE payment_orders SET status = 'expired', updated_at = ?
        WHERE status = 'pending' AND expires_at < ?`,
    )
    .run(now(), now());
  return res.changes;
}

export function publicOrder(order: PaymentOrder) {
  return {
    id: order.public_id,
    provider: order.provider,
    method: order.method,
    amount_minor: order.amount_minor,
    bonus_minor: order.bonus_minor,
    credited_minor: order.credited_minor,
    status: order.status,
    failure_reason: order.failure_reason,
    created_at: order.created_at,
    expires_at: order.expires_at,
    simulated: order.provider === "mock",
  };
}
