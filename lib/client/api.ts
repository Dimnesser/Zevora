"use client";

/**
 * Typed client for the Zevora API.
 *
 * Every call goes through here so error handling, credentials and
 * idempotency keys are applied consistently instead of per component.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
}

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * The static build published to GitHub Pages has no API to call, so every
 * request is served by an in-browser backend instead. The import is lazy
 * so the demo engine and its catalogue never enter the bundle of a build
 * that talks to a real server.
 */
const STATIC_DEMO = process.env.NEXT_PUBLIC_ZEVORA_STATIC === "1";

async function request<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  if (STATIC_DEMO) {
    const { demoRequest } = await import("@/lib/client/demo/engine");
    return demoRequest<T>(path, init);
  }

  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (init.idempotencyKey) headers.set("idempotency-key", init.idempotencyKey);

  const res = await fetch(path, {
    ...init,
    headers,
    // The session cookie is httpOnly, so it has to ride along explicitly.
    credentials: "same-origin",
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (payload as { error?: ApiErrorShape } | null)?.error;
    throw new ApiRequestError(
      err?.code ?? "server_error",
      err?.message ?? "Не удалось выполнить запрос",
      res.status,
    );
  }

  return payload as T;
}

/** Idempotency key for a mutating call that must never double-apply. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/* ───────────────────────── types ───────────────────────── */

export interface Rarity {
  slug: string;
  name: string;
  color: string;
  effect?: string;
}

export interface ArtSpec {
  kind: string;
  pattern: string;
  color_a: string;
  color_b: string;
}

export interface SessionUser {
  id: number;
  username: string;
  role: "user" | "owner";
  balance_minor: number;
  avatar_seed: string;
  level: number;
  xp: number;
  created_at: number;
  partner: {
    tier: string;
    since: number | null;
    promo_code: string | null;
    ref_code: string | null;
    perks: string[];
    daily_minor: number | null;
    ref_multiplier: number | null;
    campaigns: string[];
  } | null;
  bonuses: {
    daily_claimed_at: number | null;
    daily_streak: number;
    registration_claimed: boolean;
  };
}

export interface CaseSummary {
  id: number;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  price_minor: number;
  is_active: boolean;
  is_demo: boolean;
  partner_only: boolean;
  tags: string[];
  art: { emblem: string; color_a: string; color_b: string };
  item_count?: number;
  best_price_minor?: number | null;
  top_skins?: { image_url: string; market_name: string }[];
}

export interface CaseItem {
  id: number;
  skin_id: number;
  market_name: string;
  weapon: string;
  finish: string;
  price_minor: number;
  weight: number;
  chance: number;
  min_float: number;
  max_float: number;
  stattrak_enabled: boolean;
  image_url: string | null;
  rarity: Rarity;
  art: ArtSpec;
}

export interface InventoryItem {
  id: number;
  skin_id: number;
  market_name: string;
  weapon: string;
  finish: string;
  price_minor: number;
  wear: string;
  float_value: number;
  stattrak: boolean;
  source: string;
  source_case: { name: string; slug: string } | null;
  status: string;
  acquired_at: number;
  image_url: string | null;
  rarity: Rarity;
  art: ArtSpec;
}

export interface Opening {
  id: number;
  created_at: number;
  username: string;
  avatar_seed: string;
  case: { name: string; slug: string };
  market_name: string;
  weapon: string;
  finish: string;
  price_paid_minor: number;
  value_minor: number;
  image_url: string | null;
  rarity: Rarity;
  art: ArtSpec;
  audit: { roll: number; total_weight: number };
}

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
    rarity: Rarity;
    art: ArtSpec;
  };
  balance_minor: number;
  audit: { roll: number; total_weight: number };
}

export interface Transaction {
  id: number;
  kind: string;
  label: string;
  amount_minor: number;
  balance_after_minor: number;
  created_at: number;
}

/* ───────────────────────── endpoints ───────────────────────── */

export const api = {
  // auth
  me: () => request<{ user: SessionUser | null }>("/api/auth/me"),
  login: (username: string, password: string) =>
    request<{ user: SessionUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string) =>
    request<{ user: SessionUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  stats: () => request<{ stats: MyStats; series: ActivityPoint[] }>("/api/me/stats"),

  // cases
  cases: () => request<{ cases: CaseSummary[] }>("/api/cases"),
  caseDetail: (slug: string) =>
    request<{
      case: CaseSummary;
      items: CaseItem[];
      expected_value_minor: number;
    }>(`/api/cases/${slug}`),
  openCase: (slug: string, key: string) =>
    request<OpenResult>(`/api/cases/${slug}/open`, {
      method: "POST",
      idempotencyKey: key,
    }),

  // inventory
  inventory: (params: { sort?: string; rarity?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.sort) qs.set("sort", params.sort);
    if (params.rarity) qs.set("rarity", params.rarity);
    return request<{
      items: InventoryItem[];
      total: number;
      value_minor: number;
      counts: Record<string, number>;
    }>(`/api/inventory?${qs}`);
  },
  sell: (ids: number[]) =>
    request<{ sold: number; amount_minor: number; balance_minor: number }>(
      "/api/inventory/sell",
      { method: "POST", body: JSON.stringify({ ids }) },
    ),
  withdraw: (ids: number[], tradeUrl: string) =>
    request<{ queued: number }>("/api/inventory/withdraw", {
      method: "POST",
      body: JSON.stringify({ ids, trade_url: tradeUrl }),
    }),

  // history
  openings: (params: { scope?: "me" | "all"; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.scope) qs.set("scope", params.scope);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    return request<{ openings: Opening[]; total: number; scope: string }>(
      `/api/openings?${qs}`,
    );
  },
  live: (limit = 20) => request<{ drops: Opening[] }>(`/api/live?limit=${limit}`),

  // wallet
  deposit: (amount: number, method: string) =>
    request<{ credited_minor: number; bonus_minor: number; balance_minor: number }>(
      "/api/wallet/deposit",
      { method: "POST", body: JSON.stringify({ amount, method }) },
    ),
  transactions: (limit = 60) =>
    request<{ transactions: Transaction[] }>(`/api/transactions?limit=${limit}`),

  // bonuses
  daily: () =>
    request<{ amount_minor: number; streak: number; balance_minor: number }>(
      "/api/bonuses/daily",
      { method: "POST" },
    ),
  promo: (code: string) =>
    request<{ amount_minor: number; balance_minor: number }>("/api/bonuses/promo", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  registrationBonus: () =>
    request<{ amount_minor: number; balance_minor: number }>(
      "/api/bonuses/registration",
      { method: "POST" },
    ),

  // shop & upgrade
  buy: (skinId: number) =>
    request<{
      inventory_id: number;
      cost_minor: number;
      balance_minor: number;
      market_name: string;
    }>("/api/shop/buy", {
      method: "POST",
      body: JSON.stringify({ skin_id: skinId }),
    }),
  upgrade: (itemIds: number[], targetSkinId: number) =>
    request<{
      success: boolean;
      chance: number;
      roll: number;
      stake_minor: number;
      target: { skin_id: number; market_name: string };
      won: {
        inventory_id: number;
        price_minor: number;
        wear: string;
        float_value: number;
      } | null;
    }>("/api/upgrade", {
      method: "POST",
      body: JSON.stringify({ item_ids: itemIds, target_skin_id: targetSkinId }),
    }),

  // contracts (trade-up)
  contracts: () =>
    request<{ size: number; groups: ContractGroup[] }>("/api/contracts"),
  runContract: (itemIds: number[]) =>
    request<ContractResult>("/api/contracts", {
      method: "POST",
      body: JSON.stringify({ item_ids: itemIds }),
    }),

  leaderboard: (period = "week") =>
    request<{
      period: string;
      rows: {
        rank: number;
        id: number;
        username: string;
        avatar_seed: string;
        partner_tier: string | null;
        opens: number;
        spent_minor: number;
        won_minor: number;
        best_minor: number;
      }[];
    }>(`/api/leaderboard?period=${period}`),

  // admin
  admin: {
    cases: () => request<{ cases: CaseSummary[] }>("/api/admin/cases"),
    caseDetail: (id: number) =>
      request<{
        case: CaseSummary;
        items: CaseItem[];
        expected_value_minor: number;
        total_weight: number;
      }>(`/api/admin/cases/${id}`),
    createCase: (body: Record<string, unknown>) =>
      request<{ case: CaseSummary }>("/api/admin/cases", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateCase: (id: number, body: Record<string, unknown>) =>
      request<{ case: CaseSummary }>(`/api/admin/cases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteCase: (id: number, hard = false) =>
      request<{ deleted?: boolean; archived?: boolean }>(
        `/api/admin/cases/${id}${hard ? "?hard=1" : ""}`,
        { method: "DELETE" },
      ),
    addItem: (caseId: number, body: Record<string, unknown>) =>
      request<{ item: CaseItem }>(`/api/admin/cases/${caseId}/items`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateItem: (caseId: number, itemId: number, body: Record<string, unknown>) =>
      request<{ item: CaseItem }>(`/api/admin/cases/${caseId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    deleteItem: (caseId: number, itemId: number) =>
      request<{ deleted: boolean; remaining: number }>(
        `/api/admin/cases/${caseId}/items/${itemId}`,
        { method: "DELETE" },
      ),
    caseStats: (id: number, period: string) =>
      request<{ period: string; stats: CaseStatsShape }>(
        `/api/admin/cases/${id}/stats?period=${period}`,
      ),
    skins: (q = "", rarity = "all") =>
      request<{ skins: AdminSkin[] }>(
        `/api/admin/skins?q=${encodeURIComponent(q)}&rarity=${rarity}`,
      ),
    rarities: () => request<{ rarities: AdminRarity[] }>("/api/admin/rarities"),
    createRarity: (body: Record<string, unknown>) =>
      request<{ rarity: AdminRarity }>("/api/admin/rarities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    stats: (period: string) =>
      request<{ period: string; stats: PlatformStatsShape }>(
        `/api/admin/stats?period=${period}`,
      ),
    users: (q = "") =>
      request<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`),
    grantPartner: (userId: number, tier: string) =>
      request<{ ok: true; tier: string; promo_code: string }>(
        `/api/admin/users/${userId}/partner`,
        { method: "PUT", body: JSON.stringify({ tier }) },
      ),
    updatePartner: (userId: number, body: Record<string, unknown>) =>
      request<{ ok: true }>(`/api/admin/users/${userId}/partner`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    revokePartner: (userId: number) =>
      request<{ ok: true }>(`/api/admin/users/${userId}/partner`, {
        method: "DELETE",
      }),
  },
};

export interface ActivityPoint {
  day: string;
  opens: number;
  spent_minor: number;
  won_minor: number;
}

export interface ContractGroup {
  rarity: { slug: string; name: string; color: string; sort_order: number };
  next: { slug: string; name: string; color: string };
  owned: number;
  outcomes: number;
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

export interface MyStats {
  cases_opened: number;
  spent_minor: number;
  won_minor: number;
  best_minor: number;
  upgrades: number;
  upgrades_won: number;
  inventory_items: number;
  inventory_value_minor: number;
  best_drop: {
    market_name: string;
    value_minor: number;
    created_at: number;
  } | null;
}

export interface AdminSkin {
  id: number;
  slug: string;
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
  default_weight: number;
  image_url: string | null;
}

export interface AdminRarity {
  id: number;
  slug: string;
  name: string;
  color: string;
  default_weight: number;
  effect: string;
  sort_order: number;
  skin_count?: number;
}

export interface AdminUser {
  id: number;
  username: string;
  avatar_seed: string;
  role: string;
  balance_minor: number;
  partner_tier: string | null;
  partner_since: number | null;
  promo_code: string | null;
  ref_code: string | null;
  partner_perks: string | null;
  partner_daily_minor: number | null;
  partner_ref_multiplier: number | null;
  partner_campaigns: string | null;
  created_at: number;
  spent_minor: number;
  opens: number;
}

export interface CaseStatsShape {
  opens: number;
  revenue_minor: number;
  payout_minor: number;
  margin: number;
  avg_value_minor: number;
  best: {
    market_name: string;
    value_minor: number;
    username: string;
    created_at: number;
  } | null;
  drops: {
    skin_id: number;
    market_name: string;
    rarity_name: string;
    rarity_color: string;
    weight: number;
    expected: number;
    count: number;
    actual: number;
  }[];
}

export interface PlatformStatsShape {
  opens: number;
  revenue_minor: number;
  payout_minor: number;
  margin: number;
  users: number;
  active_users: number;
}
