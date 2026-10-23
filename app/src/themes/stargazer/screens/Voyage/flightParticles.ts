/* The seeded particles of the flight: the same on every device, and the same every time. */

function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const STREAKS = (() => { const r = rng(21); return Array.from({ length: 48 }, () => ({ a: r() * Math.PI * 2, ph: r(), w: 1 + r() * 2 })); })();
export const PTS = (() => { const r = rng(33); return Array.from({ length: 80 }, () => ({ x: r(), y: r(), s: r(), sp: 0.4 + r() * 0.9, ph: r(), a: r() * Math.PI * 2 })); })();

export const tones = (art: string): [string, string, string] => [`var(--sg-${art}-1)`, `var(--sg-${art}-2)`, `var(--sg-${art}-3)`];
