import "server-only";

import { randomFloatBetween } from "@/lib/server/rng";
import { scaleMinor } from "@/lib/server/money";

/**
 * Wear tiers, matching CS2's float bands.
 * The multiplier is what turns a skin's base price into the price of a
 * specific instance — a Factory New drop is worth more than the listing.
 */
export const WEAR_TIERS = [
  { wear: "Factory New", min: 0.0, max: 0.07, multiplier: 1.18 },
  { wear: "Minimal Wear", min: 0.07, max: 0.15, multiplier: 1.06 },
  { wear: "Field-Tested", min: 0.15, max: 0.38, multiplier: 0.92 },
  { wear: "Well-Worn", min: 0.38, max: 0.45, multiplier: 0.81 },
  { wear: "Battle-Scarred", min: 0.45, max: 1.0, multiplier: 0.72 },
] as const;

export type Wear = (typeof WEAR_TIERS)[number]["wear"];

export function wearForFloat(value: number): (typeof WEAR_TIERS)[number] {
  for (const tier of WEAR_TIERS) {
    if (value >= tier.min && value < tier.max) return tier;
  }
  return WEAR_TIERS[WEAR_TIERS.length - 1];
}

/** StatTrak carries a premium on the market; Zevora mirrors that. */
export const STATTRAK_MULTIPLIER = 1.25;
export const STATTRAK_CHANCE = 0.1;

/**
 * Rolls a concrete instance of a skin within the float window the case
 * item allows, and prices it.
 */
export function rollInstance(opts: {
  basePriceMinor: number;
  minFloat: number;
  maxFloat: number;
  stattrak: boolean;
}): { wear: Wear; floatValue: number; priceMinor: number } {
  const raw = randomFloatBetween(opts.minFloat, opts.maxFloat);
  const floatValue = Number(raw.toFixed(4));
  const tier = wearForFloat(floatValue);

  let priceMinor = scaleMinor(opts.basePriceMinor, tier.multiplier);
  if (opts.stattrak) {
    priceMinor = scaleMinor(priceMinor, STATTRAK_MULTIPLIER);
  }

  return {
    wear: tier.wear,
    floatValue,
    // An instance is never worthless, even at the bottom of the range.
    priceMinor: Math.max(1, priceMinor),
  };
}
