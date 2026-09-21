"use client";

import { ApiRequestError, type CaseItem, type InventoryItem } from "@/lib/client/api";
import {
  STATTRAK_CHANCE,
  STATTRAK_MULTIPLIER,
  bandForFloat,
} from "@/lib/client/wear";
import { catalogue, load, mutate, reset, type DemoState } from "@/lib/client/demo/store";

/**
 * The in-browser backend for the static demo build.
 *
 * GitHub Pages serves files, not processes, so the published site runs
 * the real interface against this instead of the API. Every rule the
 * server enforces is reimplemented here from the same constants — the
 * weighted draw, the wear roll, the StatTrak chance, the contract's float
 * formula — so what the demo shows is what the server would do.
 *
 * What it deliberately does NOT reproduce is the part that only a server
 * can mean: the draw happens in the visitor's own browser, so it proves
 * nothing and secures nothing. That is the difference the demo banner
 * states on its face, and it is why the real product needs a host.
 */

const RARITY_LADDER = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
  "extraordinary",
  "contraband",
];

const rarityRank = (slug: string) => {
  const i = RARITY_LADDER.indexOf(slug);
  return i === -1 ? RARITY_LADDER.length : i;
};

const now = () => Date.now();

/** How long an unpaid order stays payable. Matches the server's TTL. */
const ORDER_TTL_MS = 30 * 60_000;

/** Opaque order id, in place of the server's random token. */
function randomId(): string {
  const buf = new Uint8Array(9);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/[+/=]/g, "").slice(0, 12);
}

function expireIfStale<T extends { status: string; expires_at: number }>(
  order: T | undefined,
): T | undefined {
  if (order && order.status === "pending" && now() > order.expires_at) {
    order.status = "expired";
  }
  return order;
}

function fail(code: string, message: string, status = 400): never {
  throw new ApiRequestError(code, message, status);
}

/* ─────────────── randomness ─────────────── */

/** Unbiased integer in [0, max). Rejection-sampled, like the server's. */
function randomInt(max: number): number {
  if (max <= 0) throw new Error("randomInt: max must be positive");
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % max;
}

const randomUnit = () => randomInt(0x100000000) / 0x100000000;

function randomFloatBetween(min: number, max: number): number {
  return max <= min ? min : min + randomUnit() * (max - min);
}

function drawWeighted<T extends { weight: number }>(pool: T[]) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  const roll = randomInt(total);
  let cursor = 0;
  for (const entry of pool) {
    cursor += entry.weight;
    if (roll < cursor) return { item: entry, roll, totalWeight: total };
  }
  throw new Error("drawWeighted: cursor overflow");
}

/** Prices a concrete instance, exactly as `rollInstance` does server-side. */
function rollInstance(base: number, minFloat: number, maxFloat: number, stattrak: boolean) {
  const floatValue = Number(randomFloatBetween(minFloat, maxFloat).toFixed(4));
  const band = bandForFloat(floatValue);
  let price = Math.round(base * band.multiplier);
  if (stattrak) price = Math.round(price * STATTRAK_MULTIPLIER);
  return { wear: band.wear, floatValue, priceMinor: Math.max(1, price) };
}

/* ─────────────── account ─────────────── */

const STARTING_BALANCE = 250_000;

function newUser(username: string): DemoState["user"] {
  return {
    id: 1,
    username,
    role: "user",
    balance_minor: STARTING_BALANCE,
    avatar_seed: username,
    level: 1,
    xp: 0,
    created_at: Math.floor(now() / 1000),
    partner: null,
    bonuses: { daily_claimed_at: null, daily_streak: 0, registration_claimed: false },
  };
}

function requireUser(state: DemoState) {
  if (!state.user) fail("unauthorized", "Требуется вход в аккаунт", 401);
  return state.user;
}

/**
 * Writes a ledger line, and — unless told otherwise — moves the balance
 * by the same amount.
 *
 * `moves: false` mirrors the server, where `recordTransaction` without
 * `applyCredit` records the line and leaves the balance alone. An upgrade
 * is the case that needs it: the stake is items, which have already been
 * consumed, so its signed amount describes what the attempt was worth and
 * must never be taken out of the money balance. Doing so debited the
 * player for items they had already handed over, and on a win it invented
 * money that no rule allows.
 */
function record(
  state: DemoState,
  kind: string,
  label: string,
  amount: number,
  opts: { moves?: boolean } = {},
): number {
  const user = requireUser(state);
  const moves = opts.moves !== false;
  const balance = moves ? user.balance_minor + amount : user.balance_minor;
  if (balance < 0) fail("insufficient_funds", "Недостаточно средств на балансе", 409);
  user.balance_minor = balance;
  state.transactions.unshift({
    id: state.seq.tx++,
    kind,
    label,
    amount_minor: amount,
    balance_after_minor: balance,
    created_at: now(),
  });
  return balance;
}

const owned = (state: DemoState) => state.inventory.filter((i) => i.status === "owned");

/**
 * A detached copy of a stored object.
 *
 * Everything in this module mutates the persisted state in place, which
 * is fine for storage and wrong for React: a component handed the same
 * reference twice sees no change and does not re-render. Responses
 * therefore leave through here.
 */
function snapshot<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/* ─────────────── inventory helpers ─────────────── */

function addItem(
  state: DemoState,
  src: CaseItem,
  opts: {
    price: number;
    wear: string;
    floatValue: number;
    stattrak: boolean;
    source: string;
    sourceCase: { name: string; slug: string } | null;
  },
): InventoryItem {
  const item: InventoryItem = {
    id: state.seq.item++,
    skin_id: src.skin_id,
    market_name: src.market_name,
    weapon: src.weapon,
    finish: src.finish,
    price_minor: opts.price,
    wear: opts.wear,
    float_value: opts.floatValue,
    stattrak: opts.stattrak,
    source: opts.source,
    source_case: opts.sourceCase,
    status: "owned",
    acquired_at: now(),
    image_url: src.image_url,
    rarity: src.rarity,
    art: src.art,
  };
  state.inventory.unshift(item);
  return item;
}

/** Every distinct skin in the catalogue, cheapest first. */
async function allItems(): Promise<CaseItem[]> {
  const cat = await catalogue();
  const seen = new Map<number, CaseItem>();
  for (const detail of Object.values(cat.details)) {
    for (const item of detail.items) if (!seen.has(item.skin_id)) seen.set(item.skin_id, item);
  }
  return [...seen.values()].sort((a, b) => a.price_minor - b.price_minor);
}

/* ─────────────── the endpoints ─────────────── */

const SORTS: Record<string, (a: InventoryItem, b: InventoryItem) => number> = {
  recent: (a, b) => b.acquired_at - a.acquired_at || b.id - a.id,
  "price-desc": (a, b) => b.price_minor - a.price_minor || b.id - a.id,
  "price-asc": (a, b) => a.price_minor - b.price_minor || b.id - a.id,
  rarity: (a, b) =>
    rarityRank(b.rarity.slug) - rarityRank(a.rarity.slug) || b.price_minor - a.price_minor,
};

async function route(path: string, method: string, body: Record<string, unknown>, key?: string) {
  const [route, query = ""] = path.replace(/^\/api\//, "").split("?");
  const params = new URLSearchParams(query);
  const state = load();

  /* ── auth ── */
  // A copy, always. The engine mutates the stored user in place, so
  // handing back the same object leaves React comparing a reference to
  // itself — the balance changed and the header did not.
  if (route === "auth/me") return { user: snapshot(state.user) };

  if (route === "auth/register" || route === "auth/login") {
    const username = String(body.username ?? "").trim();
    if (username.length < 3) fail("invalid_input", "Имя должно быть не короче 3 символов", 422);
    if (String(body.password ?? "").length < 6) {
      fail("invalid_input", "Пароль должен быть не короче 6 символов", 422);
    }
    return mutate((s) => {
      // One account per browser: the demo has no user table to look in,
      // so signing in simply renames the account that lives here.
      s.user = s.user ? { ...s.user, username, avatar_seed: username } : newUser(username);
      if (route === "auth/register" && s.transactions.length === 0) {
        record(s, "bonus", "Приветственный баланс", 0);
        s.transactions[0].amount_minor = STARTING_BALANCE;
        s.transactions[0].balance_after_minor = STARTING_BALANCE;
        s.transactions[0].label = "Демо-баланс";
      }
      return { user: snapshot(s.user) };
    });
  }

  if (route === "auth/logout") {
    return mutate((s) => {
      s.user = null;
      return { ok: true as const };
    });
  }

  /* ── catalogue ── */
  if (route === "cases") return { cases: (await catalogue()).cases };

  const caseDetail = route.match(/^cases\/([^/]+)$/);
  if (caseDetail) {
    const detail = (await catalogue()).details[caseDetail[1]];
    if (!detail) fail("not_found", "Кейс не найден", 404);
    return detail;
  }

  /* ── opening ── */
  const open = route.match(/^cases\/([^/]+)\/open$/);
  if (open) {
    const cat = await catalogue();
    const detail = cat.details[open[1]];
    if (!detail) fail("not_found", "Кейс не найден", 404);

    return mutate((s) => {
      const user = requireUser(s);
      if (key && s.idempotency[key]) return s.idempotency[key];

      const price = detail.case.price_minor;
      if (price > user.balance_minor) {
        fail("insufficient_funds", "Недостаточно средств на балансе", 409);
      }

      const { item: won, roll, totalWeight } = drawWeighted(
        detail.items.map((i) => ({ ...i, weight: i.weight })),
      );
      const stattrak = won.stattrak_enabled && randomUnit() < STATTRAK_CHANCE;
      const inst = rollInstance(won.price_minor, won.min_float, won.max_float, stattrak);

      const source = { name: detail.case.name, slug: detail.case.slug };
      const item = addItem(s, won, {
        price: inst.priceMinor,
        wear: inst.wear,
        floatValue: inst.floatValue,
        stattrak,
        source: "case",
        sourceCase: source,
      });

      const balance = record(s, "case", `${detail.case.name} → ${won.market_name}`, -price);
      user.xp += 40;

      const opening = {
        id: s.seq.opening++,
        created_at: now(),
        username: user.username,
        avatar_seed: user.avatar_seed,
        case: source,
        market_name: won.market_name,
        weapon: won.weapon,
        finish: won.finish,
        price_paid_minor: price,
        value_minor: inst.priceMinor,
        image_url: won.image_url,
        rarity: won.rarity,
        art: won.art,
        audit: { roll, total_weight: totalWeight },
      };
      s.openings.unshift(opening);

      const result = {
        opening_id: opening.id,
        case: { slug: detail.case.slug, name: detail.case.name, price_minor: price },
        item: {
          inventory_id: item.id,
          skin_id: won.skin_id,
          market_name: won.market_name,
          weapon: won.weapon,
          finish: won.finish,
          wear: inst.wear,
          float_value: inst.floatValue,
          stattrak,
          price_minor: inst.priceMinor,
          image_url: won.image_url,
          rarity: won.rarity,
          art: won.art,
        },
        balance_minor: balance,
        audit: { roll, total_weight: totalWeight },
      };
      if (key) s.idempotency[key] = result;
      return result;
    });
  }

  /* ── inventory ── */
  if (route === "inventory" && method === "GET") {
    const sort = SORTS[params.get("sort") ?? "recent"] ?? SORTS.recent;
    const rarity = params.get("rarity");
    let items = state.inventory.filter((i) => i.status === "owned" || i.status === "withdrawing");
    if (rarity && rarity !== "all") items = items.filter((i) => i.rarity.slug === rarity);
    items = [...items].sort(sort);
    // Counts are over the whole inventory, not the filtered view: the
    // rarity tabs must keep showing what a filter would reveal.
    const counts: Record<string, number> = {};
    for (const i of state.inventory) {
      if (i.status !== "owned" && i.status !== "withdrawing") continue;
      counts[i.rarity.slug] = (counts[i.rarity.slug] ?? 0) + 1;
    }
    return {
      items: snapshot(items),
      total: items.length,
      value_minor: items.reduce((s, i) => s + i.price_minor, 0),
      counts,
    };
  }

  if (route === "inventory/sell") {
    const ids = (body.ids as number[]) ?? [];
    return mutate((s) => {
      const rows = s.inventory.filter((i) => ids.includes(i.id) && i.status === "owned");
      if (rows.length === 0) fail("conflict", "Предметы недоступны", 409);
      const amount = rows.reduce((sum, i) => sum + i.price_minor, 0);
      rows.forEach((i) => (i.status = "sold"));
      const label =
        rows.length === 1 ? `Продажа — ${rows[0].market_name}` : `Продажа ${rows.length} предм.`;
      const balance = record(s, "sell", label, amount);
      return { sold: rows.length, amount_minor: amount, balance_minor: balance };
    });
  }

  if (route === "inventory/withdraw" && method === "GET") {
    return { withdrawals: snapshot(state.withdrawals) };
  }

  if (route === "inventory/withdraw") {
    const ids = (body.ids as number[]) ?? [];
    const tradeUrl = String(body.trade_url ?? "");
    if (!/^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/.test(tradeUrl)) {
      fail("invalid_input", "Укажите корректную ссылку на обмен Steam", 422);
    }
    return mutate((s) => {
      const rows = s.inventory.filter((i) => ids.includes(i.id) && i.status === "owned");
      if (rows.length === 0) fail("conflict", "Предметы недоступны", 409);
      const withdrawal = {
        id: randomId(),
        status: "pending" as const,
        item_count: rows.length,
        value_minor: rows.reduce((sum, i) => sum + i.price_minor, 0),
        note: null,
        created_at: now(),
        resolved_at: null,
        trade_url_hint: tradeUrl.slice(-12),
        item_ids: rows.map((i) => i.id),
      };
      rows.forEach((i) => (i.status = "withdrawing"));
      s.withdrawals.unshift(withdrawal);
      s.transactions.unshift({
        id: s.seq.tx++,
        kind: "withdraw",
        label: `Заявка на вывод — ${rows.length} предм.`,
        amount_minor: 0,
        balance_after_minor: requireUser(s).balance_minor,
        created_at: now(),
      });
      return {
        queued: rows.length,
        withdrawal: snapshot(withdrawal),
      };
    });
  }

  const cancelWithdrawal = route.match(/^withdrawals\/([^/]+)$/);
  if (cancelWithdrawal && method === "DELETE") {
    return mutate((s) => {
      const w = s.withdrawals.find((x) => x.id === cancelWithdrawal[1]);
      if (!w) fail("not_found", "Заявка не найдена", 404);
      if (w.status !== "pending") fail("conflict", "Заявка уже закрыта", 409);
      w.status = "cancelled";
      w.resolved_at = now();
      // The items come back, which is the whole point of being able to
      // cancel: nothing may be left held by a closed request.
      for (const item of s.inventory) {
        if (w.item_ids.includes(item.id) && item.status === "withdrawing") {
          item.status = "owned";
        }
      }
      return { withdrawal: snapshot(w) };
    });
  }

  /* ── history and feeds ── */
  if (route === "openings") {
    const limit = Number(params.get("limit") ?? 50);
    const offset = Number(params.get("offset") ?? 0);
    if (params.get("scope") === "all") fail("forbidden", "Недостаточно прав", 403);
    return {
      openings: snapshot(state.openings.slice(offset, offset + limit)),
      total: state.openings.length,
    };
  }

  if (route === "live") {
    const limit = Number(params.get("limit") ?? 20);
    // The real feed shows above-common drops by real accounts. Here the
    // only real account is yours, so the rail fills as you play rather
    // than inventing strangers to populate it.
    return {
      drops: snapshot(
        state.openings.filter((o) => rarityRank(o.rarity.slug) >= 1).slice(0, limit),
      ),
    };
  }

  if (route === "transactions") {
    const limit = Number(params.get("limit") ?? 60);
    return { transactions: snapshot(state.transactions.slice(0, limit)) };
  }

  if (route === "me/stats") {
    const user = requireUser(state);
    const cases = state.openings.length;
    const inv = owned(state);
    const upgrades = state.transactions.filter((t) => t.kind.startsWith("upgrade"));
    const best = state.openings.reduce(
      (acc, o) => (o.value_minor > (acc?.value_minor ?? 0) ? o : acc),
      null as (typeof state.openings)[number] | null,
    );
    return {
      stats: {
        cases_opened: cases,
        spent_minor: state.transactions
          .filter((t) => t.amount_minor < 0)
          .reduce((s, t) => s - t.amount_minor, 0),
        won_minor: state.openings.reduce((s, o) => s + o.value_minor, 0),
        best_minor: best?.value_minor ?? 0,
        upgrades: upgrades.length,
        upgrades_won: upgrades.filter((t) => t.kind === "upgrade-win").length,
        inventory_items: inv.length,
        inventory_value_minor: inv.reduce((s, i) => s + i.price_minor, 0),
        best_drop: best
          ? {
              market_name: best.market_name,
              value_minor: best.value_minor,
              created_at: best.created_at,
            }
          : null,
      },
      series: seriesFor(state),
      user_id: user.id,
    };
  }

  if (route === "leaderboard") {
    const user = state.user;
    if (!user || state.openings.length === 0) return { period: "week", rows: [] };
    return {
      period: params.get("period") ?? "week",
      rows: [
        {
          rank: 1,
          id: user.id,
          username: user.username,
          avatar_seed: user.avatar_seed,
          partner_tier: null,
          opens: state.openings.length,
          spent_minor: state.openings.reduce((s, o) => s + o.price_paid_minor, 0),
          won_minor: state.openings.reduce((s, o) => s + o.value_minor, 0),
          best_minor: Math.max(...state.openings.map((o) => o.value_minor)),
        },
      ],
    };
  }

  /* ── wallet and bonuses ── */
  if (route === "wallet/deposit") {
    const amount = Number(body.amount ?? 0);
    if (!Number.isInteger(amount) || amount < 100 || amount > 300_000) {
      fail("invalid_input", "Сумма вне допустимых границ", 422);
    }
    const rates: Record<string, number> = { card: 0, sbp: 0.03, crypto: 0.07 };
    const rate = rates[String(body.method ?? "card")];
    if (rate === undefined) fail("invalid_input", "Неизвестный способ оплаты", 422);

    // Opening an order does not touch the balance — same rule as the
    // server. Calling this in a loop produces unpaid orders and nothing
    // else, which is the whole point of the change.
    return mutate((s) => {
      requireUser(s);
      const order = {
        id: randomId(),
        provider: "mock",
        method: String(body.method ?? "card"),
        amount_minor: amount * 100,
        bonus_minor: Math.round(amount * 100 * rate),
        credited_minor: 0,
        status: "pending" as const,
        failure_reason: null,
        created_at: now(),
        expires_at: now() + ORDER_TTL_MS,
        simulated: true,
      };
      s.orders.unshift(order);
      return { order: snapshot(order), pay_url: `/wallet/pay/${order.id}`, simulated: true };
    });
  }

  const orderRoute = route.match(/^wallet\/orders\/([^/]+)$/);
  if (orderRoute) {
    const order = expireIfStale(state.orders.find((o) => o.id === orderRoute[1]));
    if (!order) fail("not_found", "Заказ не найден", 404);
    return { order: snapshot(order) };
  }

  const simulateRoute = route.match(/^wallet\/orders\/([^/]+)\/simulate$/);
  if (simulateRoute) {
    const outcome = String(body.outcome ?? "paid");
    if (outcome !== "paid" && outcome !== "failed") {
      fail("invalid_input", "Неизвестный исход платежа", 422);
    }
    return mutate((s) => {
      const order = s.orders.find((o) => o.id === simulateRoute[1]);
      if (!order) fail("not_found", "Заказ не найден", 404);
      // Only a pending order settles; a replayed confirmation credits
      // nothing, exactly as the server's conditional UPDATE guarantees.
      if (order.status !== "pending") {
        return { order: snapshot(order), credited: false, balance_minor: null };
      }
      if (now() > order.expires_at) {
        order.status = "expired";
        fail("conflict", "Срок оплаты заказа истёк", 409);
      }
      if (outcome === "failed") {
        order.status = "failed";
        order.failure_reason = "Платёж отменён плательщиком";
        return { order: snapshot(order), credited: false, balance_minor: null };
      }
      const total = order.amount_minor + order.bonus_minor;
      order.status = "paid";
      order.credited_minor = total;
      const balance = record(s, "deposit", "Пополнение баланса", total);
      return { order: snapshot(order), credited: true, balance_minor: balance };
    });
  }

  if (route === "bonuses/daily") {
    return mutate((s) => {
      const user = requireUser(s);
      const last = user.bonuses.daily_claimed_at;
      const day = 86_400_000;
      if (last && now() - last * 1000 < day) {
        fail("conflict", "Бонус уже получен сегодня", 409);
      }
      const streak = last && now() - last * 1000 < 2 * day ? user.bonuses.daily_streak + 1 : 1;
      const amount = 5000 + Math.min(streak, 7) * 1500;
      user.bonuses = {
        ...user.bonuses,
        daily_claimed_at: Math.floor(now() / 1000),
        daily_streak: streak,
      };
      const balance = record(s, "bonus", `Ежедневный бонус · день ${streak}`, amount);
      return { amount_minor: amount, streak, balance_minor: balance };
    });
  }

  if (route === "bonuses/registration") {
    return mutate((s) => {
      const user = requireUser(s);
      if (user.bonuses.registration_claimed) fail("conflict", "Бонус уже получен", 409);
      user.bonuses = { ...user.bonuses, registration_claimed: true };
      const balance = record(s, "bonus", "Бонус за регистрацию", 10_000);
      return { amount_minor: 10_000, balance_minor: balance };
    });
  }

  if (route === "bonuses/promo") {
    fail("not_found", "В демо-версии промокоды недоступны", 404);
  }

  /* ── shop ── */
  if (route === "shop/buy") {
    const skinId = Number(body.skin_id);
    const src = (await allItems()).find((i) => i.skin_id === skinId);
    if (!src) fail("not_found", "Предмет не найден", 404);
    return mutate((s) => {
      // The shop sells at a markup, as the server does.
      const cost = Math.round(src.price_minor * 1.12);
      const inst = rollInstance(src.price_minor, 0, 0.38, false);
      const item = addItem(s, src, {
        price: inst.priceMinor,
        wear: inst.wear,
        floatValue: inst.floatValue,
        stattrak: false,
        source: "shop",
        sourceCase: null,
      });
      const balance = record(s, "shop", `Покупка — ${src.market_name}`, -cost);
      return {
        inventory_id: item.id,
        cost_minor: cost,
        balance_minor: balance,
        market_name: src.market_name,
      };
    });
  }

  /* ── upgrade ── */
  if (route === "upgrade") {
    const ids = (body.item_ids as number[]) ?? [];
    const targetId = Number(body.target_skin_id);
    const target = (await allItems()).find((i) => i.skin_id === targetId);
    if (!target) fail("not_found", "Целевой предмет не найден", 404);

    return mutate((s) => {
      const user = requireUser(s);
      // An empty stake would otherwise sail through the length check and
      // buy a 1% shot at anything for nothing.
      if (ids.length === 0) fail("invalid_input", "Выберите предметы для ставки", 422);
      if (ids.length > 5) fail("invalid_input", "Максимум 5 предметов в ставке", 422);
      const staked = s.inventory.filter((i) => ids.includes(i.id) && i.status === "owned");
      if (staked.length !== ids.length) fail("conflict", "Некоторые предметы недоступны", 409);
      const stake = staked.reduce((sum, i) => sum + i.price_minor, 0);
      if (target.price_minor <= stake) fail("invalid_input", "Цель должна быть дороже ставки", 422);

      const chanceValue = Math.min(0.85, Math.max(0.01, (stake / target.price_minor) * 0.92));
      const roll = randomUnit();
      const success = roll < chanceValue;
      staked.forEach((i) => (i.status = "consumed"));

      let won: InventoryItem | null = null;
      if (success) {
        const inst = rollInstance(target.price_minor, 0, 0.38, false);
        won = addItem(s, target, {
          price: inst.priceMinor,
          wear: inst.wear,
          floatValue: inst.floatValue,
          stattrak: false,
          source: "upgrade",
          sourceCase: null,
        });
      }
      record(
        s,
        success ? "upgrade-win" : "upgrade-loss",
        success
          ? `Апгрейд удался — ${target.market_name}`
          : `Апгрейд не удался — ${staked.length} предм.`,
        success ? (won?.price_minor ?? 0) - stake : -stake,
        // The stake was items, not money; the line records the attempt's
        // worth without the balance following it.
        { moves: false },
      );
      user.xp += 60;

      return {
        success,
        chance: chanceValue,
        roll,
        stake_minor: stake,
        target: { skin_id: target.skin_id, market_name: target.market_name },
        won: won
          ? {
              inventory_id: won.id,
              price_minor: won.price_minor,
              wear: won.wear,
              float_value: won.float_value,
            }
          : null,
      };
    });
  }

  /* ── contracts ── */
  if (route === "contracts" && method === "GET") {
    const cat = await catalogue();
    const groups = new Map<string, { rarity: CaseItem["rarity"]; owned: number }>();
    for (const item of owned(state)) {
      const g = groups.get(item.rarity.slug) ?? { rarity: item.rarity, owned: 0 };
      g.owned += 1;
      groups.set(item.rarity.slug, g);
    }
    const universe = Object.values(cat.details).flatMap((d) => d.items);
    return {
      size: 10,
      groups: [...groups.values()]
        .map((g) => {
          const next = nextRarity(universe, g.rarity.slug);
          if (!next) return null;
          return {
            rarity: { ...g.rarity, sort_order: rarityRank(g.rarity.slug) },
            next,
            owned: g.owned,
            outcomes: new Set(
              universe.filter((i) => i.rarity.slug === next.slug).map((i) => i.skin_id),
            ).size,
          };
        })
        .filter(Boolean)
        .sort((a, b) => rarityRank(a!.rarity.slug) - rarityRank(b!.rarity.slug)),
    };
  }

  if (route === "contracts" && method === "POST") {
    const ids = (body.item_ids as number[]) ?? [];
    if (ids.length !== 10) fail("invalid_input", "В контракт нужно ровно 10 предметов", 422);
    if (new Set(ids).size !== ids.length) {
      fail("invalid_input", "Предмет нельзя использовать дважды", 422);
    }
    const cat = await catalogue();

    return mutate((s) => {
      const user = requireUser(s);
      const staked = s.inventory.filter((i) => ids.includes(i.id) && i.status === "owned");
      if (staked.length !== 10) fail("conflict", "Некоторые предметы недоступны", 409);
      const from = staked[0].rarity;
      if (staked.some((i) => i.rarity.slug !== from.slug)) {
        fail("invalid_input", "Все предметы должны быть одной редкости", 422);
      }
      const universe = Object.values(cat.details).flatMap((d) => d.items);
      const next = nextRarity(universe, from.slug);
      if (!next) fail("invalid_input", "Выше этой редкости подниматься некуда", 422);

      // Each input contributes the case it came from; that case's tickets
      // are split evenly among its outcomes of the next tier.
      const tickets = new Map<string, number>();
      for (const item of staked) {
        const slugs = item.source_case
          ? [item.source_case.slug]
          : Object.entries(cat.details)
              .filter(([, d]) => d.items.some((i) => i.skin_id === item.skin_id))
              .map(([slug]) => slug);
        for (const slug of slugs) tickets.set(slug, (tickets.get(slug) ?? 0) + 1);
      }

      const pool: (CaseItem & { weight: number; case_slug: string })[] = [];
      for (const [slug, count] of tickets) {
        const outcomes = (cat.details[slug]?.items ?? []).filter(
          (i) => i.rarity.slug === next.slug,
        );
        if (outcomes.length === 0) continue;
        const share = Math.max(1, Math.floor(1_000_000 / outcomes.length));
        for (const o of outcomes) pool.push({ ...o, weight: count * share, case_slug: slug });
      }
      if (pool.length === 0) {
        fail(
          "invalid_input",
          `Из этих предметов нельзя собрать контракт: в их кейсах нет предметов редкости «${next.name}»`,
          422,
        );
      }

      const { item: target, roll, totalWeight } = drawWeighted(pool);
      const avgFloat = staked.reduce((sum, i) => sum + i.float_value, 0) / staked.length;
      const floatValue = Number(
        (avgFloat * (target.max_float - target.min_float) + target.min_float).toFixed(4),
      );
      const band = bandForFloat(floatValue);
      const stattrak = target.stattrak_enabled && staked.every((i) => i.stattrak);
      let price = Math.round(target.price_minor * band.multiplier);
      if (stattrak) price = Math.round(price * STATTRAK_MULTIPLIER);
      price = Math.max(1, price);

      const stake = staked.reduce((sum, i) => sum + i.price_minor, 0);
      staked.forEach((i) => (i.status = "consumed"));
      const item = addItem(s, target, {
        price,
        wear: band.wear,
        floatValue,
        stattrak,
        source: "contract",
        sourceCase: cat.details[target.case_slug]
          ? {
              name: cat.details[target.case_slug].case.name,
              slug: target.case_slug,
            }
          : null,
      });
      user.xp += 80;

      return {
        contract_id: s.seq.contract++,
        consumed: staked.length,
        stake_minor: stake,
        average_float: Number(avgFloat.toFixed(4)),
        rarity: { slug: from.slug, name: from.name },
        won: {
          inventory_id: item.id,
          skin_id: target.skin_id,
          market_name: target.market_name,
          price_minor: price,
          wear: band.wear,
          float_value: floatValue,
          stattrak,
        },
        pool_size: pool.length,
        audit: { roll, total_weight: totalWeight },
      };
    });
  }

  fail("not_found", `В демо-версии этот раздел недоступен (${route})`, 404);
}

/** The first rarity above `slug` that any case actually contains. */
function nextRarity(universe: CaseItem[], slug: string) {
  const above = universe
    .filter((i) => rarityRank(i.rarity.slug) > rarityRank(slug))
    .sort((a, b) => rarityRank(a.rarity.slug) - rarityRank(b.rarity.slug));
  return above[0]?.rarity ?? null;
}

/** Daily totals for the profile chart, over the last two weeks. */
function seriesFor(state: DemoState) {
  const day = 86_400_000;
  const start = now() - 13 * day;
  return Array.from({ length: 14 }, (_, i) => {
    const from = start + i * day;
    const slice = state.openings.filter((o) => o.created_at >= from && o.created_at < from + day);
    return {
      day: new Date(from).toISOString().slice(0, 10),
      opens: slice.length,
      spent_minor: slice.reduce((s, o) => s + o.price_paid_minor, 0),
      won_minor: slice.reduce((s, o) => s + o.value_minor, 0),
    };
  });
}

/** Drop-in replacement for `request()` in the static build. */
export async function demoRequest<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  // A beat of latency, so skeletons and loading states are actually seen
  // rather than flashing past in a single frame.
  await new Promise((r) => setTimeout(r, 90 + Math.random() * 120));
  return (await route(path, init.method ?? "GET", body, init.idempotencyKey)) as T;
}

export { reset as resetDemo };
