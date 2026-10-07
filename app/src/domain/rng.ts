/** The one source of randomness in the domain: a seeded mulberry32. A seed is
    taken as an unsigned 32-bit integer, so there are 2^32 distinct streams. */
import type { Rng } from './types';

export function rngFromSeed(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length) % arr.length];
export const ri = (rng: Rng, n: number) => Math.floor(rng() * n) % n;
