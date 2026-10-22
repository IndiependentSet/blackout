import { BREEDS } from '../../assets/cats';

/* The fixed scatter of stars and warp streaks, drawn once from a seeded generator so every run looks the same. */

export const W = 390;
export const H = 844;

/** The stage in film units (the whole screen), and where the W×H column sits centred in it. */
export interface Frame { w: number; h: number }
export const columnAt = (f: Frame) => ({ ox: (f.w - W) / 2, oy: (f.h - H) / 2 });

function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const STARS = (() => {
  const r = rng(7);
  return Array.from({ length: 70 }, () => ({ x: r() * 100, y: r() * 100, r: 1 + r() * 2, dur: 2 + r() * 4, ph: r() * 6 }));
})();

export const STREAKS = (() => {
  const r = rng(21);
  return Array.from({ length: 44 }, () => ({ a: r() * Math.PI * 2, ph: r(), w: 1 + r() * 2 }));
})();

/** How bright a star is at time T. */
export const twinkle = (T: number, s: { dur: number; ph: number }): number => 0.2 + 0.75 * Math.abs(Math.sin(T / s.dur * 3 + s.ph));

/** One cat sprite, by breed and pose. */
export function sprite(key: string, pose: 'wakeA' | 'wakeB'): string {
  return (BREEDS.find(b => b.key === key) ?? BREEDS[0])[pose];
}
