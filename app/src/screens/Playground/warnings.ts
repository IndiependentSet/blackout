/* Settings that quietly cancel each other out: the generator accepts them, but one of them can never take effect, so
   turning it changes nothing. The panel says so instead of leaving it to be found out. Pure. */
import type { PlaygroundParams } from './params';

/** Lattice cells a star can reach with a line no longer than `reach`: the most lines it could ever have. */
export function reachableCells(reach: number): number {
  let n = 0;
  const r = Math.floor(reach);
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    if ((dx || dy) && dx * dx + dy * dy <= reach * reach + 1e-9) n++;
  }
  return n;
}

export function paramWarnings(p: PlaygroundParams): string[] {
  const out: string[] = [];
  const cells = reachableCells(p.reach);
  if (p.maxDegree > cells) {
    out.push(`Max degree ${p.maxDegree} can't be reached: with edge reach ${p.reach} a star has only ${cells} cells in reach, so it gets at most ${cells} lines.`);
  }
  const cap = Math.min(p.maxDegree, cells);
  if (p.strategy === 'free') {
    if (p.density > cap) {
      out.push(`Density ${p.density.toFixed(1)} can't be reached: no star may have more than ${cap} lines (${cap === p.maxDegree ? 'max degree' : 'edge reach'}), so skies come out at ${cap} or below. Raise ${cap === p.maxDegree ? 'Max degree' : 'Edge reach'} to go denser.`);
    }
    if (p.minDegree >= 2 && p.minDegree > p.density) {
      out.push(`Min degree ${p.minDegree} is above the density ${p.density.toFixed(1)}: every star needs at least ${p.minDegree} lines, so most tries are thrown away.`);
    }
  }
  if (p.minDegree >= 2 && p.minDegree > cap) {
    out.push(`Min degree ${p.minDegree} is above what any star can have (${cap}): no level can be made.`);
  }
  return out;
}
