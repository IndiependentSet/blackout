import { hintLeaf, hintMatching, hintReveal } from '../../domain/engine';
import type { Hint, HintTier, Level } from '../../domain/types';

export interface HintResult { hint: Hint | null; msg: string }

/** What a consultant says, and what they point at. SURVEY / ESTIMATE / INSIDER. */
export function consult(lv: Level, placed: number[], tier: HintTier): HintResult {
  const p = new Set(placed);
  if (tier === 1) {
    const h = hintLeaf(lv, p);
    return {
      hint: h ? { kind: 'leaf', leaf: h.leaf, forced: h.forced } : null,
      msg: h ? 'ONE FIXTURE ONLY — ITS NEIGHBOUR IS HIRED' : 'NO DEAD-END PADS LEFT',
    };
  }
  if (tier === 2) {
    const m = hintMatching(lv);
    return { hint: { kind: 'proof', edges: m }, msg: 'ESTIMATE: ' + m.length + ' CATS MINIMUM' };
  }
  const v = hintReveal(lv, p);
  return {
    hint: v == null ? null : { kind: 'reveal', node: v },
    msg: v == null ? 'THE WHOLE CREW IS ALREADY ON SITE' : 'THIS PAD IS IN THE ANSWER',
  };
}

export const HINT_LABELS: Record<HintTier, string> = { 1: 'SURVEY', 2: 'ESTIMATE', 3: 'INSIDER' };
export const HINT_KIND: Record<HintTier, Hint['kind']> = { 1: 'leaf', 2: 'proof', 3: 'reveal' };
