import type { CaseDefinition, InventoryItem, Skin, Wear } from "@/types";
import { getSkin } from "@/data/skins";
import { clamp, uid } from "@/lib/utils";

/** Wear tiers with the float range each covers. */
const WEAR_TABLE: { wear: Wear; min: number; max: number; mult: number }[] = [
  { wear: "Factory New", min: 0, max: 0.07, mult: 1.18 },
  { wear: "Minimal Wear", min: 0.07, max: 0.15, mult: 1.06 },
  { wear: "Field-Tested", min: 0.15, max: 0.38, mult: 0.92 },
  { wear: "Well-Worn", min: 0.38, max: 0.45, mult: 0.81 },
  { wear: "Battle-Scarred", min: 0.45, max: 1, mult: 0.72 },
];

export function rollWear(rnd: () => number = Math.random): {
  wear: Wear;
  float: number;
  mult: number;
} {
  // Skew toward the middle tiers, the way real drops feel.
  const raw = Math.pow(rnd(), 1.6);
  const float = clamp(raw, 0.0001, 0.9999);
  const tier =
    WEAR_TABLE.find((t) => float >= t.min && float < t.max) ?? WEAR_TABLE[2];
  return { wear: tier.wear, float, mult: tier.mult };
}

/** Pick a skin id from a case using the weighted drop table. */
export function rollCase(
  def: CaseDefinition,
  rnd: () => number = Math.random,
): string {
  const total = def.drops.reduce((s, d) => s + d.weight, 0);
  let ticket = rnd() * total;
  for (const drop of def.drops) {
    ticket -= drop.weight;
    if (ticket <= 0) return drop.skinId;
  }
  return def.drops[def.drops.length - 1].skinId;
}

/** Chance that an opened item comes with the Counter (StatTrak-like) tag. */
const COUNTER_CHANCE = 0.1;

export function createItem(
  skinId: string,
  source: InventoryItem["source"],
  rnd: () => number = Math.random,
): InventoryItem {
  const skin: Skin = getSkin(skinId);
  const { wear, float, mult } = rollWear(rnd);
  const counter = rnd() < COUNTER_CHANCE;
  const price = Math.round(skin.price * mult * (counter ? 1.25 : 1));
  return {
    uid: uid("itm"),
    skinId,
    wear,
    float: Number(float.toFixed(4)),
    price,
    counter,
    acquiredAt: Date.now(),
    source,
    status: "owned",
  };
}

/** Expected value of a case — shown on the case page as honest maths. */
export function caseExpectedValue(def: CaseDefinition): number {
  const total = def.drops.reduce((s, d) => s + d.weight, 0);
  return def.drops.reduce(
    (sum, d) => sum + (d.weight / total) * getSkin(d.skinId).price,
    0,
  );
}

export function dropChance(def: CaseDefinition, skinId: string): number {
  const total = def.drops.reduce((s, d) => s + d.weight, 0);
  const drop = def.drops.find((d) => d.skinId === skinId);
  return drop ? drop.weight / total : 0;
}

/** The single most valuable skin in a case — used for the card preview. */
export function topDrop(def: CaseDefinition): Skin {
  return def.drops
    .map((d) => getSkin(d.skinId))
    .sort((a, b) => b.price - a.price)[0];
}
