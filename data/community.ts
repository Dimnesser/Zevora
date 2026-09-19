import type { LeaderboardEntry, LiveDrop, PartnerTier } from "@/types";
import { mulberry32, seededInt } from "@/lib/rng";
import { CASES } from "@/data/cases";
import { SKINS } from "@/data/skins";

const NICKS = [
  "vortexkiller",
  "m1rage",
  "shadowfox",
  "kr1stal",
  "nebula_ok",
  "hexbyte",
  "aimlock",
  "cyberdrift",
  "soulreaper",
  "zerolag",
  "prizrak",
  "tundra",
  "novaeight",
  "glitchy",
  "ravenous",
  "smoke_on_a",
  "wallbangz",
  "eco_round",
  "clutchgod",
  "flashbang",
  "silentwave",
  "orbitals",
  "kvadrat",
  "neonpin",
  "ferrum",
  "lowfps",
  "deagler",
  "sunsetboy",
  "mirage_ct",
  "overpassed",
];

/**
 * Canonical seed of who holds a partner status and at which level.
 * The store and the leaderboard both read this, so a badge in the rating
 * always matches the roster in the admin panel.
 */
export const SEEDED_PARTNERS: Record<string, PartnerTier> = {
  vortexkiller: "ambassador",
  nebula_ok: "elite",
  hexbyte: "creator",
  kr1stal: "partner",
};

const LEADERBOARD_SEED = 991733;
const LIVE_SEED = 40721;

/**
 * Seeded — never Math.random — so server and client markup match and
 * hydration stays clean. Replace with a real API call in services/api.ts.
 */
export function buildLeaderboard(count = 20): LeaderboardEntry[] {
  const rnd = mulberry32(LEADERBOARD_SEED);
  const rows: LeaderboardEntry[] = [];
  let spent = 2_450_000;

  for (let i = 0; i < count; i++) {
    const name = NICKS[i % NICKS.length];
    spent = Math.round(spent * (0.82 + rnd() * 0.1));
    const won = Math.round(spent * (0.78 + rnd() * 0.5));
    rows.push({
      rank: i + 1,
      username: name,
      avatarSeed: name,
      spent,
      won,
      upgrades: seededInt(rnd, 12, 480),
      partnerTier: SEEDED_PARTNERS[name] ?? null,
    });
  }
  return rows;
}

/** Seeded initial live feed. New entries are appended client-side. */
export function buildLiveDrops(count = 16): LiveDrop[] {
  const rnd = mulberry32(LIVE_SEED);
  const pool = SKINS.filter((s) => s.rarity !== "common");
  const publicCases = CASES.filter((c) => !c.partnerOnly);
  const drops: LiveDrop[] = [];

  for (let i = 0; i < count; i++) {
    const skin = pool[Math.floor(rnd() * pool.length)];
    const kase = publicCases[Math.floor(rnd() * publicCases.length)];
    const nick = NICKS[Math.floor(rnd() * NICKS.length)];
    drops.push({
      id: `live_seed_${i}`,
      username: nick,
      avatarSeed: nick,
      skinId: skin.id,
      caseSlug: kase.slug,
      // Fixed offsets — no Date.now() at module scope, which would drift
      // between the server render and the client hydration.
      at: 0 - i * 1000,
    });
  }
  return drops;
}

export const COMMUNITY_NICKS = NICKS;
