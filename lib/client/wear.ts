/**
 * Wear bands, mirrored for the client.
 *
 * `lib/server/wear.ts` is the authority and is marked server-only, so the
 * bounds live here too — the client uses them to show what a float means
 * before the server has priced anything. Keep the two in step.
 */
export const WEAR_BANDS = [
  { wear: "Factory New", max: 0.07 },
  { wear: "Minimal Wear", max: 0.15 },
  { wear: "Field-Tested", max: 0.38 },
  { wear: "Well-Worn", max: 0.45 },
  { wear: "Battle-Scarred", max: 1.0 },
] as const;

export function wearForFloat(value: number): string {
  for (const band of WEAR_BANDS) {
    if (value < band.max) return band.wear;
  }
  return WEAR_BANDS[WEAR_BANDS.length - 1].wear;
}
