/* Hand-drawn skies: an admin places stars on the lattice and joins them with lines, and the solver turns the
   drawing into a level (par, the answer, how many answers, the stars it is worth). The generator's other way in:
   no seed, no RNG, so nothing here can move a generated level. Pure. */
import { distPtSeg } from '../geometry';
import { crossingPairs } from '../graphStats';
import type { Cell, Edge, Level, SkyFigure } from '../types';
import { DEFAULT_GEN, MAX_LEVEL_NODES } from './options';
import { difficulty, solve } from './solver';

/** What a drawing comes to: the level it makes (null while it cannot be one), and what is wrong with it. */
export interface FigureCheck {
  level: Level | null;
  /** how many optimal covers; the game needs exactly 1 */
  optima: number;
  /** the other optimal covers, for the stepper */
  alts: number[][];
  /** what stops it being a level at all */
  errors: string[];
  /** what a generated sky would never have, or what the game refuses (more than one answer) */
  warnings: string[];
  /** the game's rule: a level and exactly one answer */
  playable: boolean;
}

export const EMPTY_FIGURE: SkyFigure = { nodes: [], edges: [] };

const sameCell = (a: Cell, b: Cell) => a.c === b.c && a.r === b.r;
const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Every star's neighbours. */
export function adjacency(fig: SkyFigure): number[][] {
  const adj = fig.nodes.map((): number[] => []);
  for (const [a, b] of fig.edges) { adj[a]?.push(b); adj[b]?.push(a); }
  return adj;
}

/** Why a drawing cannot be a level. */
export function figureErrors(fig: SkyFigure): string[] {
  const errors: string[] = [];
  const n = fig.nodes.length;
  if (n < 2) errors.push('Place at least two stars.');
  if (n > MAX_LEVEL_NODES) errors.push(`At most ${MAX_LEVEL_NODES} stars: this sky has ${n}.`);
  if (fig.nodes.some(p => !Number.isInteger(p.c) || !Number.isInteger(p.r))) errors.push('Every star sits on a grid cell.');
  if (fig.nodes.some((p, i) => fig.nodes.findIndex(q => sameCell(p, q)) !== i)) errors.push('Two stars share a cell.');
  const seen = new Set<string>();
  for (const [a, b] of fig.edges) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= n || b >= n) { errors.push('A line ends nowhere.'); break; }
    if (a === b) { errors.push('A line joins a star to itself.'); break; }
    const k = edgeKey(a, b);
    if (seen.has(k)) { errors.push('Two lines join the same stars.'); break; }
    seen.add(k);
  }
  if (!fig.edges.length) errors.push('Draw at least one line.');
  return errors;
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** What a generated sky would not have: allowed, but flagged. */
export function figureWarnings(fig: SkyFigure): string[] {
  const out: string[] = [];
  const adj = adjacency(fig);
  const lonely = adj.filter(a => a.length === 0).length;
  if (lonely) out.push(`${plural(lonely, 'star')} with no line: ${lonely === 1 ? 'it is' : 'they are'} never needed.`);
  const crossings = crossingPairs(fig).length;
  if (crossings) out.push(`${plural(crossings, 'pair')} of lines cross.`);
  const long = fig.edges.filter(([a, b]) => {
    const A = fig.nodes[a], B = fig.nodes[b];
    return A && B && Math.hypot(B.c - A.c, B.r - A.r) > DEFAULT_GEN.reach + 1e-9;
  }).length;
  if (long) out.push(`${plural(long, 'line')} longer than a generated sky allows.`);
  const over = fig.edges.filter(([a, b]) => fig.nodes.some((p, i) => {
    const A = fig.nodes[a], B = fig.nodes[b];
    return i !== a && i !== b && A && B && distPtSeg(p, A, B) < DEFAULT_GEN.clearance;
  })).length;
  if (over) out.push(`${plural(over, 'line')} pass${over === 1 ? 'es' : ''} over a star that is not theirs.`);
  const busy = adj.filter(a => a.length > DEFAULT_GEN.maxDegree).length;
  if (busy) out.push(`${plural(busy, 'star')} with more than ${DEFAULT_GEN.maxDegree} lines.`);
  if (components(adj) > 1) out.push('The sky is in separate pieces.');
  return out;
}

/** Connected pieces among the stars that have a line. */
function components(adj: number[][]): number {
  const seen = new Uint8Array(adj.length);
  let count = 0;
  for (let s = 0; s < adj.length; s++) {
    if (seen[s] || !adj[s].length) continue;
    count++;
    const stack = [s];
    seen[s] = 1;
    while (stack.length) for (const u of adj[stack.pop() as number]) if (!seen[u]) { seen[u] = 1; stack.push(u); }
  }
  return count;
}

/** Turn a drawing into a level and say what is wrong with it. Same drawing, same answer. */
export function checkFigure(fig: SkyFigure): FigureCheck {
  const errors = figureErrors(fig);
  const warnings = figureWarnings(fig);
  const none = { level: null, optima: 0, alts: [], errors, warnings, playable: false };
  if (errors.length) return none;
  const nodes = fig.nodes.map(p => ({ c: p.c, r: p.r }));
  const edges = fig.edges.map(([a, b]) => [a, b] as Edge);
  const adj = adjacency(fig);
  let r;
  try { r = solve({ nodes, edges, adj }, DEFAULT_GEN.solverCap); } catch {
    return { ...none, errors: ['The solver gave up on this sky: too many ways to cover it.'] };
  }
  const level: Level = { nodes, edges, adj, k: r.k, sol: r.sol, stars: difficulty({ nodes, adj }) };
  if (r.count !== 1) warnings.push(`${r.count} best answers: the game needs exactly one.`);
  return { level, optima: r.count, alts: r.alts, errors, warnings, playable: r.count === 1 };
}

/** The level a drawing makes; throws when it makes none (callers check the drawing first). */
export function levelFromFigure(fig: SkyFigure): Level {
  const { level, errors } = checkFigure(fig);
  if (!level) throw new Error(`not a sky: ${errors.join(' ')}`);
  return level;
}

/** The same drawing moved so its top-left star sits at cell (0, 0). */
export function normalizeFigure(fig: SkyFigure): SkyFigure {
  if (!fig.nodes.length) return { nodes: [], edges: fig.edges.map(([a, b]) => [a, b]) };
  const c0 = Math.min(...fig.nodes.map(p => p.c)), r0 = Math.min(...fig.nodes.map(p => p.r));
  return { nodes: fig.nodes.map(p => ({ c: p.c - c0, r: p.r - r0 })), edges: fig.edges.map(([a, b]) => [a, b]) };
}

/* ---------- editing: each returns a new drawing, or the same one when the edit makes no sense ---------- */

/** The star on a cell, or -1. */
export const starAt = (fig: SkyFigure, cell: Cell): number => fig.nodes.findIndex(p => sameCell(p, cell));

export function addStar(fig: SkyFigure, cell: Cell): SkyFigure {
  if (starAt(fig, cell) >= 0 || fig.nodes.length >= MAX_LEVEL_NODES) return fig;
  return { nodes: [...fig.nodes, { c: cell.c, r: cell.r }], edges: fig.edges };
}

export function moveStar(fig: SkyFigure, i: number, cell: Cell): SkyFigure {
  if (!fig.nodes[i] || starAt(fig, cell) >= 0) return fig;
  return { nodes: fig.nodes.map((p, j) => (j === i ? { c: cell.c, r: cell.r } : p)), edges: fig.edges };
}

/** Remove a star and its lines; the stars after it move down an index. */
export function removeStar(fig: SkyFigure, i: number): SkyFigure {
  if (!fig.nodes[i]) return fig;
  const at = (v: number) => (v > i ? v - 1 : v);
  return {
    nodes: fig.nodes.filter((_, j) => j !== i),
    edges: fig.edges.filter(([a, b]) => a !== i && b !== i).map(([a, b]) => [at(a), at(b)]),
  };
}

/** Join two stars, or take the line between them away. */
export function toggleLine(fig: SkyFigure, a: number, b: number): SkyFigure {
  if (a === b || !fig.nodes[a] || !fig.nodes[b]) return fig;
  const k = edgeKey(a, b);
  const has = fig.edges.some(([u, v]) => edgeKey(u, v) === k);
  return { nodes: fig.nodes, edges: has ? fig.edges.filter(([u, v]) => edgeKey(u, v) !== k) : [...fig.edges, [a, b]] };
}

export function removeLine(fig: SkyFigure, index: number): SkyFigure {
  if (!fig.edges[index]) return fig;
  return { nodes: fig.nodes, edges: fig.edges.filter((_, j) => j !== index) };
}

/* ---------- a compact text form, for the playground's URL hash: "c,r;c,r|a-b;a-b" ---------- */

export function encodeFigure(fig: SkyFigure): string {
  return fig.nodes.map(p => `${p.c},${p.r}`).join(';') + '|' + fig.edges.map(([a, b]) => `${a}-${b}`).join(';');
}

/** The inverse of encodeFigure; null for anything it did not write. */
export function decodeFigure(text: string): SkyFigure | null {
  const [ns, es = ''] = text.split('|');
  if (ns === undefined) return null;
  const int = (s: string) => (/^-?\d{1,4}$/.test(s) ? Number(s) : NaN);
  const nodes = ns ? ns.split(';').map(s => { const [c, r] = s.split(','); return { c: int(c ?? ''), r: int(r ?? '') }; }) : [];
  const edges = es ? es.split(';').map(s => { const [a, b] = s.split('-'); return [int(a ?? ''), int(b ?? '')] as Edge; }) : [];
  if (nodes.some(p => Number.isNaN(p.c) || Number.isNaN(p.r)) || edges.some(([a, b]) => Number.isNaN(a) || Number.isNaN(b))) return null;
  if (nodes.length > MAX_LEVEL_NODES * 2 || edges.some(([a, b]) => a < 0 || b < 0 || a >= nodes.length || b >= nodes.length)) return null;
  return { nodes, edges };
}
