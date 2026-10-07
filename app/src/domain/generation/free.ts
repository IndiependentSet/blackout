/* The free strategy: no templates. Junctions are placed one at a time inside a
   box whose size follows `spread`, each wired to an open junction within
   reach (so the graph is connected by construction), then paths are added
   until the mean degree reaches `density`. Every path still passes the same
   rules as a gadget's (degree, reach, clearance, crossings, girth).
   Internal to generation/. */
import { pick, ri } from '../rng';
import type { GenOptions, Rng } from '../types';
import { addEdge, addNode, near, newG, nodeOk, openNodes, restore, snapshot, type Graph } from './builder';
import type { SolveResult } from './solver';

/** Weight of a path of this length: length^(3·bias), so -1 favours short, 0 is even, 1 favours long. */
const lengthWeight = (len: number, bias: number) => len ** (3 * bias);

const length = (g: Graph, a: number, b: number) =>
  Math.hypot(g.nodes[b].c - g.nodes[a].c, g.nodes[b].r - g.nodes[a].r);

/** Remove and return one item, chosen with probability proportional to its weight. */
function takeWeighted<T>(rng: Rng, items: { item: T; w: number }[]): T {
  const total = items.reduce((s, x) => s + x.w, 0);
  let x = rng() * total, i = 0;
  while (i < items.length - 1 && x >= items[i].w) { x -= items[i].w; i++; }
  return items.splice(i, 1)[0].item;
}

/** A new junction next to one open junction, wired to it. False if that junction has no room around it. */
function placeNear(g: Graph, rng: Rng, a: number, side: number): boolean {
  const { reach, lengthBias } = g.cfg;
  const R = Math.floor(reach), A = g.nodes[a];
  const cells: { item: [number, number]; w: number }[] = [];
  for (let dc = -R; dc <= R; dc++) for (let dr = -R; dr <= R; dr++) {
    const c = A.c + dc, r = A.r + dr, len = Math.hypot(dc, dr);
    if (len === 0 || len > reach || c < 0 || r < 0 || c >= side || r >= side) continue;
    if (nodeOk(g, c, r)) cells.push({ item: [c, r], w: lengthWeight(len, lengthBias) });
  }
  while (cells.length) {
    const [c, r] = takeWeighted(rng, cells);
    const snap = snapshot(g);
    const id = addNode(g, c, r);
    if (id >= 0 && addEdge(g, a, id)) return true;
    restore(g, snap);
  }
  return false;
}

/** A new path from a to some open junction within reach. */
function linkFrom(g: Graph, rng: Rng, a: number): boolean {
  if (g.adj[a].length >= g.cfg.maxDegree) return false;
  const cand = openNodes(g).filter(b => b !== a && !g.adj[a].includes(b) && near(g, a, b))
    .map(b => ({ item: b, w: lengthWeight(length(g, a, b), g.cfg.lengthBias) }));
  while (cand.length) if (addEdge(g, a, takeWeighted(rng, cand))) return true;
  return false;
}

/** Grow a free graph of exactly `size` junctions, or null if the lattice ran out of room. */
export function growFree(rng: Rng, size: number, cfg: GenOptions): Graph | null {
  const g = newG(cfg);
  const side = Math.max(2, Math.ceil(Math.sqrt(size * cfg.spread)));
  addNode(g, ri(rng, side), ri(rng, side));
  while (g.nodes.length < size) {
    const anchors = openNodes(g);
    let placed = false;
    while (anchors.length && !placed) placed = placeNear(g, rng, anchors.splice(ri(rng, anchors.length), 1)[0], side);
    if (!placed) return null;
  }
  const target = Math.max(size - 1, Math.round((size * cfg.density) / 2));
  for (let fails = 0; g.edges.length < target && fails < 4 * target;) {
    const open = openNodes(g);
    if (open.length < 2) break;
    if (!linkFrom(g, rng, pick(rng, open))) fails++;
  }
  return g;
}

/* Tie-break without leaves: two optimal covers disagree somewhere, so give one
   of those junctions another path. A spur (the gadget tie-break) would plant a
   leaf and pull the level towards the leaf rule, i.e. towards ★. */
export function repairEdge(g: Graph, rng: Rng, r: SolveResult): boolean {
  const A = new Set(r.sol), B = new Set(r.alt || []);
  const diffs = [...A].filter(v => !B.has(v)).concat([...B].filter(v => !A.has(v)));
  while (diffs.length) if (linkFrom(g, rng, diffs.splice(ri(rng, diffs.length), 1)[0])) return true;
  return false;
}
