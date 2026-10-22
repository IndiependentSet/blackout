import type { MiniEdge, MiniNode } from './lookup';

/* the training site: two leaves hang off the hub, a three-pad tail hangs off
   the other side. Only {hub, D} covers all five paths with two cats. */
export const TRAIN_NODES: MiniNode[] = [
  { x: 52, y: 52, b: 0 }, { x: 52, y: 170, b: 1 }, { x: 128, y: 111, b: 2 },
  { x: 214, y: 66, b: 3 }, { x: 278, y: 140, b: 4 }, { x: 196, y: 186, b: 5 },
];
export const TRAIN_EDGES: MiniEdge[] = [[0, 2, 'mug'], [1, 2, 'pot'], [2, 3, 'lamp'], [3, 4, 'books'], [4, 5, 'fishbowl']];
export const TRAIN_K = 2;
const HUB = 2, LEAF = 0;
/** After this many taps, a nudge appears — the way SURVEY would point at a leaf. */
export const NUDGE_AFTER_TAPS = 3;

export type NoteTone = 'neutral' | 'good' | 'bad' | 'hint';
export interface Training { smashed: number; done: boolean; perfect: boolean; pulse: number | undefined; note: string; tone: NoteTone }

/** How the training site stands, and what the foreman says about it. */
export function trainingState(placed: number[], taps: number): Training {
  const on = new Set(placed);
  const smashed = TRAIN_EDGES.filter(([u, v]) => on.has(u) || on.has(v)).length;
  const done = smashed === TRAIN_EDGES.length;
  const perfect = done && placed.length === TRAIN_K;
  const pulse = !done && taps >= NUDGE_AFTER_TAPS && !on.has(HUB) ? LEAF : undefined;
  const over = placed.length - TRAIN_K;

  let note = 'TAP A PAD TO HIRE · TAP AGAIN TO RECALL', tone: NoteTone = 'neutral';
  if (perfect) { note = 'HIRED! YOU’RE A NATURAL.'; tone = 'good'; }
  else if (done) { note = `ALL SMASHED… BUT ${over} CAT${over > 1 ? 'S' : ''} OVER BUDGET`; tone = 'bad'; }
  else if (over > 0) { note = 'PAYROLL SAYS NO — THAT’S OVER BUDGET'; tone = 'bad'; }
  else if (pulse !== undefined) { note = 'PSST: THAT GLOWING PAD HAS ONE PATH. HIRE ITS NEIGHBOUR.'; tone = 'hint'; }
  return { smashed, done, perfect, pulse, note, tone };
}
