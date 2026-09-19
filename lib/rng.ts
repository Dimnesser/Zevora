/**
 * Seeded pseudo-random generator (mulberry32).
 * Used for mock data that must render identically on server and client,
 * so hydration never mismatches.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededPick<T>(items: T[], rnd: () => number): T {
  return items[Math.floor(rnd() * items.length)];
}

export function seededInt(rnd: () => number, min: number, max: number) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
