import { clamp } from "@/lib/utils";

/**
 * Upgrade maths.
 *
 * chance = (stake / target) * HOUSE_EDGE, clamped to a sane band.
 * A single knob (HOUSE_EDGE) keeps the economy tunable from one place.
 */
export const HOUSE_EDGE = 0.92;
export const MIN_CHANCE = 0.01;
export const MAX_CHANCE = 0.85;

export function upgradeChance(stakeValue: number, targetValue: number): number {
  if (stakeValue <= 0 || targetValue <= 0) return 0;
  return clamp((stakeValue / targetValue) * HOUSE_EDGE, MIN_CHANCE, MAX_CHANCE);
}

export function upgradeMultiplier(stakeValue: number, targetValue: number) {
  if (stakeValue <= 0) return 0;
  return targetValue / stakeValue;
}

export function upgradeProfit(stakeValue: number, targetValue: number) {
  return targetValue - stakeValue;
}

/** Degrees on the upgrade dial that the success arc occupies. */
export function chanceToArc(chance: number) {
  return chance * 360;
}

export interface UpgradeRoll {
  success: boolean;
  /** 0..1 — where the needle lands. */
  roll: number;
  /** Final needle rotation in degrees (includes full spins). */
  rotation: number;
}

export function rollUpgrade(
  chance: number,
  spins = 5,
  rnd: () => number = Math.random,
): UpgradeRoll {
  const roll = rnd();
  const success = roll < chance;
  // Land the needle inside the winning arc on success, outside on failure.
  const landing = success
    ? rnd() * chance * 360 * 0.92 + chance * 360 * 0.04
    : chance * 360 + rnd() * (360 - chance * 360) * 0.94 + 6;
  return { success, roll, rotation: spins * 360 + landing };
}
