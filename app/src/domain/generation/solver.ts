/* The exact solver (minimum cover, and how many optimal covers there are: the
   uniqueness check) and the star rating (which technique clears the board). Pure. */
import type { Level, Stars } from '../types';

type Shape = Pick<Level, 'nodes' | 'edges' | 'adj'>;
type Id = number | string;
type Neighbours = Map<Id, Set<Id>>;
/** How many optimal covers besides `sol` the solver keeps (it counts all of them). */
export const KEPT_OPTIMA = 20;

export interface SolveResult {
  k: number;
  /** how many optimal covers there are */
  count: number;
  sol: number[];
  /** the first other optimal cover, if any */
  alt: number[] | null;
  /** other optimal covers, in the order found, up to KEPT_OPTIMA */
  alts: number[][];
  visits: number;
}

/* ---------- exact solver: minimum cover + how many optimal solutions ---------- */
export function solve(g: Shape, cap = 600000): SolveResult {
  const n = g.nodes.length, adj = g.adj;
  const state = new Int8Array(n);
  const order = g.nodes.map((_, i) => i).sort((a, b) => adj[b].length - adj[a].length);
  let best = n + 1, count = 0, sol: number[] | null = null, alts: number[][] = [], visits = 0;

  const lb = () => {
    const used = new Uint8Array(n); let m = 0;
    for (const [u, v] of g.edges)
      if (state[u] === 0 && state[v] === 0 && !used[u] && !used[v]) { used[u] = used[v] = 1; m++; }
    return m;
  };
  const collect = () => { const s: number[] = []; for (let i = 0; i < n; i++) if (state[i] === 1) s.push(i); return s; };

  function rec(taken: number): void {
    if (++visits > cap) throw new Error('search blew up');
    if (taken > best) return;
    let v = -1;
    for (const x of order) if (state[x] === 0) { v = x; break; }
    if (v < 0) {
      if (taken < best) { best = taken; count = 1; sol = collect(); alts = []; }
      else if (taken === best) { count++; if (alts.length < KEPT_OPTIMA) alts.push(collect()); }
      return;
    }
    if (taken + lb() > best) return;
    state[v] = 1; rec(taken + 1); state[v] = 0;
    state[v] = 2;
    const forced: number[] = []; let ok = true;
    for (const u of adj[v]) {
      if (state[u] === 2) { ok = false; break; }
      if (state[u] === 0) { state[u] = 1; forced.push(u); }
    }
    if (ok) rec(taken + forced.length);
    for (const u of forced) state[u] = 0;
    state[v] = 0;
  }
  rec(0);
  return { k: best, count, sol: sol ?? [], alt: alts[0] ?? null, alts, visits };
}

/* ---------- difficulty: which technique clears the board ---------- */
function asSets(g: Pick<Shape, 'nodes' | 'adj'>): Neighbours {
  const m: Neighbours = new Map();
  g.nodes.forEach((_, i) => m.set(i, new Set(g.adj[i])));
  return m;
}
function reduce(m: Neighbours, allowFold: boolean) {
  const at = (id: Id) => m.get(id) as Set<Id>;   // present whenever the caller has just seen the id
  let moved = true;
  while (moved) {
    moved = false;
    for (const [v, ns] of m) {
      if (ns.size === 0) { m.delete(v); moved = true; break; }
      if (ns.size === 1) {                       // leaf rule: take the neighbour
        const u = [...ns][0];
        for (const w of at(u)) m.get(w)?.delete(u);
        m.delete(u); m.delete(v); moved = true; break;
      }
      if (allowFold && ns.size === 2) {
        const [u, w] = [...ns];
        if (at(u).has(w)) {                      // triangle: take both neighbours
          for (const x of [u, w]) { for (const y of at(x)) m.get(y)?.delete(x); m.delete(x); }
          m.delete(v); moved = true; break;
        }
        const merged = new Set<Id>();            // degree-2 fold
        for (const x of [u, w]) for (const y of at(x)) if (y !== v && y !== u && y !== w) merged.add(y);
        for (const x of [v, u, w]) { for (const y of m.get(x) || []) m.get(y)?.delete(x); m.delete(x); }
        const id = 'f' + v;
        m.set(id, merged);
        for (const y of merged) at(y).add(id);
        moved = true; break;
      }
    }
  }
  return m.size === 0;
}
/** ★ the leaf rule alone clears it; ★★ with degree-2 folding and triangles; ★★★ neither. */
export function difficulty(g: Pick<Shape, 'nodes' | 'adj'>): Stars {
  if (reduce(asSets(g), false)) return 1;
  if (reduce(asSets(g), true)) return 2;
  return 3;
}
