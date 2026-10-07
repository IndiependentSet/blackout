/* How a level grows: gadgets onto a seed junction, extra edges to close rings,
   lifting low-degree junctions, and the tie-breaking repair. Internal to generation/. */
import { pick, ri } from '../rng';
import type { GenOptions, Rng } from '../types';
import { OFFS, addEdge, addNode, near, newG, openNodes, restore, type Graph } from './builder';
import { GADGETS, placeGadget, type GadgetName } from './gadgets';
import type { SolveResult } from './solver';

export function grow(rng: Rng, target: number, menu: GadgetName[], cfg: GenOptions) {
  const g = newG(cfg);
  addNode(g, 0, 0);
  let fails = 0;
  while (g.nodes.length < target - 1 && fails < 40) {
    const cand = menu.filter(k => g.nodes.length + GADGETS[k].cells.length <= target + 1);
    if (!cand.length) break;
    if (!placeGadget(g, rng, pick(rng, cand))) fails++;
  }
  return g;
}

// close nearby open junctions into rings/crowns: kills the leaf and fold rules,
// which is what forces a crown reduction or a real branch.
export function densify(g: Graph, rng: Rng, rounds: number) {
  for (let t = 0; t < rounds; t++) {
    const open = openNodes(g);
    if (open.length < 2) return;
    const a = pick(rng, open);
    const cand = open.filter(b => b !== a && !g.adj[a].includes(b) && near(g, a, b));
    if (cand.length) addEdge(g, a, pick(rng, cand));
  }
}

// raise every junction below the minimum degree by wiring it to an open
// neighbour within reach. Best effort: the lattice may simply not allow it.
export function liftDegrees(g: Graph, rng: Rng, min: number) {
  for (let v = 0; v < g.nodes.length; v++) {
    while (g.adj[v].length < min) {
      const cand = openNodes(g).filter(b => b !== v && !g.adj[v].includes(b) && near(g, v, b));
      let linked = false;
      while (cand.length && !linked) linked = addEdge(g, v, cand.splice(ri(rng, cand.length), 1)[0]);
      if (!linked) break;
    }
  }
}

function spurAt(g: Graph, v: number) {
  if (g.adj[v].length >= g.cfg.maxDegree) return false;
  for (const [dc, dr] of OFFS) {
    const id = addNode(g, g.nodes[v].c + dc, g.nodes[v].r + dr);
    if (id < 0) continue;
    if (addEdge(g, v, id)) return true;
    const snap = { n: id, e: g.edges.length, adj: g.adj.map(l => l.length) };
    restore(g, snap);
  }
  return false;
}

// Targeted tie-break: two optimal covers differ somewhere, so pin one of those
// junctions down with a spur (leaf rule then forces it) and the tie collapses.
// A spur is a leaf, so with a minimum degree only the densify fallback is left.
export function repair(g: Graph, rng: Rng, r: SolveResult) {
  if (g.cfg.minDegree > 1) return densifyOnce(g, rng);
  const A = new Set(r.sol), B = new Set(r.alt || []);
  const diffs = [...A].filter(v => !B.has(v)).concat([...B].filter(v => !A.has(v)));
  for (let t = diffs.length; t > 0; t--) {
    const v = diffs.splice(ri(rng, diffs.length), 1)[0];
    if (spurAt(g, v)) return true;
  }
  return densifyOnce(g, rng);
}
function densifyOnce(g: Graph, rng: Rng) {
  const open = openNodes(g);
  for (let t = 0; t < 8 && open.length > 1; t++) {
    const a = pick(rng, open);
    const cand = open.filter(b => b !== a && !g.adj[a].includes(b) && near(g, a, b));
    if (cand.length && addEdge(g, a, pick(rng, cand))) return true;
  }
  return false;
}
