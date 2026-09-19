import type { PartnerProfile, PartnerTier } from "@/types";
import { TIERS } from "@/data/partners";
import { hashString } from "@/lib/utils";
import { mulberry32 } from "@/lib/rng";

const DAY = 86_400_000;

/** Public origin used to build partner links. Swap for env config later. */
export const SITE_ORIGIN = "https://zevora.example";

export function promoFor(username: string): string {
  return `ZEV-${username.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10)}`;
}

export function refLinkFor(username: string): string {
  return `${SITE_ORIGIN}/?ref=${username}`;
}

/**
 * Builds a partner profile. Statistics are seeded from the username so a
 * granted partner always shows a stable, believable history.
 */
export function createPartnerProfile(
  username: string,
  tier: PartnerTier,
  since: number = Date.now() - 45 * DAY,
): PartnerProfile {
  const meta = TIERS[tier];
  const rnd = mulberry32(hashString(username + tier));
  const scale = 1 + TIERS[tier].refMultiplier;

  const series: PartnerProfile["series"] = [];
  let clicks = 0;
  let signups = 0;
  let revenue = 0;

  for (let i = 13; i >= 0; i--) {
    const d = new Date(since + (13 - i) * DAY);
    const dayClicks = Math.round((60 + rnd() * 240) * scale);
    const daySignups = Math.round(dayClicks * (0.08 + rnd() * 0.14));
    const dayRevenue = Math.round(daySignups * (180 + rnd() * 900));
    clicks += dayClicks;
    signups += daySignups;
    revenue += dayRevenue;
    series.push({
      day: `${String(d.getDate()).padStart(2, "0")}.${String(
        d.getMonth() + 1,
      ).padStart(2, "0")}`,
      clicks: dayClicks,
      signups: daySignups,
      revenue: dayRevenue,
    });
  }

  return {
    tier,
    since,
    promo: promoFor(username),
    refCode: username,
    perks: [...meta.perks],
    stats: {
      clicks,
      signups,
      active: Math.round(signups * (0.42 + rnd() * 0.25)),
      revenue,
      bonusPool: Math.round(revenue * meta.share),
    },
    series,
  };
}

export function conversion(stats: PartnerProfile["stats"]): number {
  return stats.clicks > 0 ? stats.signups / stats.clicks : 0;
}

export function tierRank(tier: PartnerTier): number {
  return ["partner", "creator", "elite", "ambassador"].indexOf(tier);
}

/** Elite and above can open the Lounge Reliquary case. */
export function canOpenLoungeCase(tier: PartnerTier | undefined | null) {
  return tier ? tierRank(tier) >= 2 : false;
}
