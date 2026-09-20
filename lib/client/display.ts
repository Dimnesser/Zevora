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

/**
 * Translucent wash behind an item card, tinted by rarity.
 *
 * The light comes from below, so the item reads as standing in a pool of
 * its own grade. Kept deliberately faint: a grid of these at full
 * strength turns the page into a colour chart, and the rarity is already
 * carried by the top edge, the underline and the chip.
 */
export function rarityGradient(color: string): string {
  return `linear-gradient(0deg, ${color}26 0%, ${color}0D 32%, transparent 64%)`;
}

export function rarityGlow(color: string): string {
  return `${color}8C`;
}

/* ───────────────────── rarity presentation ───────────────────── */

/**
 * Valve's grades, in the order the `rarities` table stores them. Slugs
 * that predate the Valve vocabulary still resolve, so an older database
 * keeps rendering.
 */
export const RARITY_COLORS: Record<string, string> = {
  consumer: "#B0C3D9",
  industrial: "#5E98D9",
  milspec: "#4B69FF",
  restricted: "#8847FF",
  classified: "#D32CE6",
  covert: "#EB4B4B",
  extraordinary: "#CAAB05",
  contraband: "#E4AE39",
  special: "#E4AE39",
};

export function rarityColor(slug: string, fallback = "#8B95AE"): string {
  return RARITY_COLORS[slug] ?? fallback;
}

/**
 * How hard to push the reveal effects. Only the top grades earn the loud
 * treatment — if everything sparkles, nothing does.
 */
export function rarityIntensity(slug: string): "plain" | "lit" | "loud" {
  const rank = rarityRank(slug);
  if (rank >= 6) return "loud";
  if (rank >= 4) return "lit";
  return "plain";
}

/* ───────────────────── item kinds ───────────────────── */

export type ItemKind = "knife" | "glove" | "rifle" | "pistol" | "other";

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  knife: "Ножи",
  glove: "Перчатки",
  rifle: "Винтовки",
  pistol: "Пистолеты",
  other: "Другое",
};

const RIFLES = ["AK-47", "M4A4", "M4A1-S", "AWP", "SSG 08", "SCAR-20", "G3SG1", "AUG", "SG 553", "FAMAS", "Galil AR"];
const PISTOLS = ["Glock-18", "USP-S", "P2000", "P250", "Desert Eagle", "Five-SeveN", "Tec-9", "CZ75-Auto", "Dual Berettas", "R8 Revolver"];

/**
 * Buckets a skin by its weapon name, for the inventory filters. Knives and
 * gloves carry Valve's ★ prefix, which makes them unambiguous; the rest is
 * a lookup so a new weapon lands in "other" rather than the wrong tab.
 */
export function itemKind(weapon: string): ItemKind {
  if (weapon.includes("Gloves") || weapon.includes("Hand Wraps")) return "glove";
  if (weapon.startsWith("★")) return "knife";
  if (RIFLES.includes(weapon)) return "rifle";
  if (PISTOLS.includes(weapon)) return "pistol";
  return "other";
}
