import "server-only";

import { randomInt } from "node:crypto";

/**
 * Server-side randomness.
 *
 * Everything here uses node:crypto's CSPRNG. `randomInt` draws from a
 * rejection-sampled uniform range, so unlike `Math.floor(Math.random() * n)`
 * it carries no modulo bias — which matters when one ticket in 100 000 is
 * a knife.
 */

export interface Weighted {
  weight: number;
}

export interface DrawResult<T> {
  item: T;
  /** The winning ticket, retained for audit. */
  roll: number;
  totalWeight: number;
  index: number;
}

/**
 * Draws one entry by integer weight.
 *
 * Throws rather than falling back to a default: an empty or malformed
 * pool is a data bug, and silently handing out the last item would hide it.
 */
export function drawWeighted<T extends Weighted>(pool: T[]): DrawResult<T> {
  if (pool.length === 0) {
    throw new Error("drawWeighted: empty pool");
  }

  let totalWeight = 0;
  for (const entry of pool) {
    if (!Number.isSafeInteger(entry.weight) || entry.weight <= 0) {
      throw new Error(`drawWeighted: invalid weight ${entry.weight}`);
    }
    totalWeight += entry.weight;
  }

  // randomInt is max-exclusive, so tickets run 0 .. totalWeight-1.
  const roll = randomInt(0, totalWeight);

  let cursor = 0;
  for (let i = 0; i < pool.length; i++) {
    cursor += pool[i].weight;
    if (roll < cursor) {
      return { item: pool[i], roll, totalWeight, index: i };
    }
  }

  // Unreachable: cursor ends at totalWeight and roll < totalWeight.
  throw new Error("drawWeighted: cursor overflow");
}

/** Uniform float in [min, max). */
export function randomFloatBetween(min: number, max: number): number {
  if (max <= min) return min;
  // 2^32 buckets is far finer than the 4 decimals a float value shows.
  const unit = randomInt(0, 2 ** 32) / 2 ** 32;
  return min + unit * (max - min);
}

export function chance(probability: number): boolean {
  return randomInt(0, 1_000_000) < Math.round(probability * 1_000_000);
}

export function randomToken(bytes = 32): string {
  // randomInt-based construction keeps this module to one crypto import.
  const buf = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) buf[i] = randomInt(0, 256);
  return buf.toString("base64url");
}
