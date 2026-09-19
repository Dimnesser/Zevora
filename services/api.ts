/**
 * Service facade.
 *
 * Every screen talks to Zevora through this module — never to the mock data
 * directly. Today each method resolves from local data with a small latency
 * so loading states are real; swapping in PostgreSQL + REST later means
 * replacing the bodies here and nothing else.
 *
 *   const cases = await api.listCases({ partner: false })
 *   →  fetch(`${API_URL}/cases`).then(r => r.json())
 */

import type {
  CaseDefinition,
  CaseTag,
  LeaderboardEntry,
  Skin,
} from "@/types";
import { CASES, visibleCases } from "@/data/cases";
import { SKINS, getSkin } from "@/data/skins";
import { buildLeaderboard } from "@/data/community";
import { sleep } from "@/lib/utils";

/** Simulated network latency, ms. Set to 0 to disable. */
const LATENCY = 220;

async function delay<T>(value: T, ms = LATENCY): Promise<T> {
  if (ms > 0) await sleep(ms);
  return value;
}

export interface ListCasesParams {
  partner?: boolean;
  tag?: CaseTag | "all";
  query?: string;
}

export const api = {
  async listCases({
    partner = false,
    tag = "all",
    query = "",
  }: ListCasesParams = {}): Promise<CaseDefinition[]> {
    let result = visibleCases(partner);
    if (tag !== "all") result = result.filter((c) => c.tags.includes(tag));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.subtitle.toLowerCase().includes(q),
      );
    }
    return delay(result);
  },

  async getCase(slug: string): Promise<CaseDefinition | null> {
    return delay(CASES.find((c) => c.slug === slug) ?? null);
  },

  async listSkins(): Promise<Skin[]> {
    return delay(SKINS);
  },

  async getSkin(id: string): Promise<Skin> {
    return delay(getSkin(id));
  },

  async getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
    return delay(buildLeaderboard(limit));
  },

  /**
   * Server-authoritative roll goes here once the backend exists — the client
   * must never decide its own drop in production.
   */
  async openCase(slug: string): Promise<{ skinId: string } | null> {
    const def = CASES.find((c) => c.slug === slug);
    if (!def) return null;
    const { rollCase } = await import("@/lib/roll");
    return delay({ skinId: rollCase(def) }, 0);
  },
};

/**
 * Live drops arrive over a socket in production:
 *
 *   const ws = new WebSocket(`${WS_URL}/live`)
 *   ws.onmessage = e => onDrop(JSON.parse(e.data))
 *
 * The mock below emits a seeded drop on an interval so the UI behaves the
 * same either way. Returns an unsubscribe function.
 */
export function subscribeLiveDrops(
  onDrop: (drop: {
    username: string;
    skinId: string;
    caseSlug: string;
  }) => void,
  intervalMs = 4200,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const start = async () => {
    const { COMMUNITY_NICKS } = await import("@/data/community");
    const pool = SKINS.filter((s) => s.rarity !== "common");
    const publicCases = CASES.filter((c) => !c.partnerOnly);

    timer = setInterval(() => {
      const skin = pool[Math.floor(Math.random() * pool.length)];
      const kase = publicCases[Math.floor(Math.random() * publicCases.length)];
      const nick =
        COMMUNITY_NICKS[Math.floor(Math.random() * COMMUNITY_NICKS.length)];
      onDrop({ username: nick, skinId: skin.id, caseSlug: kase.slug });
    }, intervalMs);
  };

  void start();

  return () => {
    if (timer) clearInterval(timer);
  };
}
