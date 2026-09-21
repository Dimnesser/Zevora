"use client";

import type {
  CaseItem,
  CaseSummary,
  InventoryItem,
  Opening,
  SessionUser,
  Transaction,
} from "@/lib/client/api";

/**
 * Persisted state for the static demo build.
 *
 * The published site has no server, so the player's account lives in this
 * browser and nowhere else. It is deliberately a single JSON blob under
 * one key: the demo has no concurrency to protect against, and one blob
 * means a version bump can discard an incompatible shape in one line
 * instead of migrating six.
 */

const KEY = "zevora.demo.v1";

export interface DemoOrder {
  id: string;
  provider: string;
  method: string;
  amount_minor: number;
  bonus_minor: number;
  credited_minor: number;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  failure_reason: string | null;
  created_at: number;
  expires_at: number;
  simulated: boolean;
}

export interface DemoState {
  version: 1;
  user: SessionUser | null;
  /** Autoincrement counters, mirroring the database's row ids. */
  seq: { item: number; tx: number; opening: number; contract: number };
  inventory: InventoryItem[];
  transactions: Transaction[];
  openings: Opening[];
  /** Replayed responses, keyed as the server keys idempotency records. */
  idempotency: Record<string, unknown>;
  /** Top-up orders, mirroring the server's payment_orders table. */
  orders: DemoOrder[];
}

function blank(): DemoState {
  return {
    version: 1,
    user: null,
    seq: { item: 1, tx: 1, opening: 1, contract: 1 },
    inventory: [],
    transactions: [],
    openings: [],
    idempotency: {},
    orders: [],
  };
}

let cache: DemoState | null = null;

export function load(): DemoState {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = blank());
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as DemoState) : null;
    cache = parsed && parsed.version === 1 ? parsed : blank();
    // A state written before orders existed is still version 1; filling
    // the gap costs one line and beats discarding somebody's inventory.
    if (!cache.orders) cache.orders = [];
  } catch {
    // Private mode, blocked storage, corrupted JSON — a fresh account is
    // a better outcome than a page that will not render.
    cache = blank();
  }
  return cache;
}

export function save(state: DemoState): void {
  cache = state;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* over quota or blocked: the session still works, it just won't persist */
  }
}

/** Reads, mutates and persists in one step. */
export function mutate<T>(fn: (state: DemoState) => T): T {
  const state = load();
  const result = fn(state);
  save(state);
  return result;
}

export function reset(): void {
  cache = blank();
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/* ─────────────── catalogue, fetched once ─────────────── */

export interface Catalogue {
  cases: CaseSummary[];
  details: Record<string, { case: CaseSummary; items: CaseItem[] }>;
}

let cataloguePromise: Promise<Catalogue> | null = null;

/**
 * The catalogue is a build-time snapshot of the real API's own responses,
 * so the demo cannot drift from the server's shapes. It is fetched rather
 * than bundled: 177 KB of JSON has no business in the landing page's
 * JavaScript.
 */
export function catalogue(): Promise<Catalogue> {
  if (!cataloguePromise) {
    const base = process.env.NEXT_PUBLIC_ZEVORA_BASE_PATH ?? "";
    cataloguePromise = fetch(`${base}/demo/catalogue.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`каталог недоступен (${r.status})`);
        return r.json() as Promise<Catalogue>;
      })
      .then((data) => withBasePath(data, base));
  }
  return cataloguePromise;
}

/**
 * The snapshot records artwork exactly as the API serves it — rooted at
 * `/cases/…` and `/skins/…`, which is correct for a site at a domain
 * root and wrong under Pages' `/<repo>/` prefix. Rewriting here keeps the
 * snapshot portable and means no component has to know where it is
 * deployed.
 */
function withBasePath<T>(value: T, base: string): T {
  if (!base) return value;
  if (typeof value === "string") {
    return (/^\/(cases|skins)\//.test(value) ? `${base}${value}` : value) as T;
  }
  if (Array.isArray(value)) return value.map((v) => withBasePath(v, base)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, withBasePath(v, base)]),
    ) as T;
  }
  return value;
}
