/**
 * Money helpers.
 *
 * Every amount crossing the database or an API boundary is an integer
 * count of minor units (копейки). Floats are only ever produced at the
 * very edge, for display.
 */

export const MINOR_PER_UNIT = 100;

export function toMinor(major: number): number {
  return Math.round(major * MINOR_PER_UNIT);
}

export function toMajor(minor: number): number {
  return minor / MINOR_PER_UNIT;
}

/**
 * Applies a multiplier to a minor amount and returns a whole number.
 * Rounding happens once, here, so repeated arithmetic cannot drift.
 */
export function scaleMinor(minor: number, factor: number): number {
  return Math.round(minor * factor);
}

/** Rejects anything that is not a safe, non-negative integer amount. */
export function isValidMinor(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}
