/**
 * Wear bands, mirrored for the client.
 *
 * `lib/server/wear.ts` is the authority and is marked server-only, so the
 * bounds and multipliers live here too — the client uses them to show
 * what a float means before the server has priced anything, and the
 * static demo build uses them to price an instance on its own. Keep the
 * two files in step.
 */
export const WEAR_BANDS = [
  { wear: "Factory New", min: 0.0, max: 0.07, multiplier: 1.18 },
  { wear: "Minimal Wear", min: 0.07, max: 0.15, multiplier: 1.06 },
  { wear: "Field-Tested", min: 0.15, max: 0.38, multiplier: 0.92 },
  { wear: "Well-Worn", min: 0.38, max: 0.45, multiplier: 0.81 },
  { wear: "Battle-Scarred", min: 0.45, max: 1.0, multiplier: 0.72 },
] as const;

export const STATTRAK_MULTIPLIER = 1.25;
export const STATTRAK_CHANCE = 0.1;

export function bandForFloat(value: number): (typeof WEAR_BANDS)[number] {
  for (const band of WEAR_BANDS) {
    if (value >= band.min && value < band.max) return band;
  }
  return WEAR_BANDS[WEAR_BANDS.length - 1];
}

export function wearForFloat(value: number): string {
  return bandForFloat(value).wear;
}
