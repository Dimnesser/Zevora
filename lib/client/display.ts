import type { ArtSpec, Rarity } from "@/lib/client/api";

/**
 * The minimum a component needs to render a skin.
 * CaseItem, InventoryItem and the opening result all satisfy this, so the
 * display components stay decoupled from which endpoint supplied them.
 */
export interface DisplaySkin {
  market_name: string;
  weapon: string;
  finish: string;
  price_minor: number;
  image_url: string | null;
  rarity: Rarity;
  art: ArtSpec;
}

/** Rarity ordering, low to high — used for sorting and effect intensity. */
export const RARITY_ORDER: string[] = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
  "special",
];

export function rarityRank(slug: string): number {
  const i = RARITY_ORDER.indexOf(slug);
  return i === -1 ? 0 : i + 1;
}

/** Translucent wash behind a card, tinted by rarity. */
export function rarityGradient(color: string): string {
  return `linear-gradient(180deg, ${color}2E, transparent 70%)`;
}

export function rarityGlow(color: string): string {
  return `${color}8C`;
}
