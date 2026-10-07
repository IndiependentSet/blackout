/* The mutable graph a level is built in, and the rules every edge must pass
   (degree, reach, clearance, crossings: all from the graph's own options).
   Internal to generation/. */
import { distPtSeg, segCross } from '../geometry';
import type { Cell, Edge, GenOptions } from '../types';

export interface Graph { nodes: Cell[]; edges: Edge[]; adj: number[][]; key: Map<string, number>; cfg: GenOptions }
export interface Snapshot { n: number; e: number; adj: number[] }

/** The four lattice neighbours. */
export const OFFS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function newG(cfg: GenOptions): Graph { return { nodes: [], edges: [], adj: [], key: new Map(), cfg }; }
const ck = (c: number, r: number) => c + ',' + r;

export function addNode(g: Graph, c: number, r: number) {
  if (g.key.has(ck(c, r))) return -1;
  const i = g.nodes.length;
  g.nodes.push({ c, r }); g.adj.push([]); g.key.set(ck(c, r), i);
  return i;
}
function edgeOk(g: Graph, a: number, b: number) {
  const { maxDegree, reach, clearance, crossings } = g.cfg;
  if (a === b || g.adj[a].includes(b)) return false;
  if (g.adj[a].length >= maxDegree || g.adj[b].length >= maxDegree) return false;
  const A = g.nodes[a], B = g.nodes[b];
  if (Math.hypot(B.c - A.c, B.r - A.r) > reach) return false;
  for (let i = 0; i < g.nodes.length; i++)
    if (i !== a && i !== b && distPtSeg(g.nodes[i], A, B) < clearance) return false;
  if (crossings) return true;
  for (const [u, v] of g.edges) {
    if (u === a || u === b || v === a || v === b) continue;
    if (segCross(A, B, g.nodes[u], g.nodes[v])) return false;
  }
  return true;
}
export function addEdge(g: Graph, a: number, b: number) {
  if (!edgeOk(g, a, b)) return false;
  g.edges.push([a, b]); g.adj[a].push(b); g.adj[b].push(a);
  return true;
}
export function snapshot(g: Graph): Snapshot { return { n: g.nodes.length, e: g.edges.length, adj: g.adj.map(l => l.length) }; }
export function restore(g: Graph, s: Snapshot) {
  for (let i = s.n; i < g.nodes.length; i++) g.key.delete(ck(g.nodes[i].c, g.nodes[i].r));
  g.nodes.length = s.n; g.adj.length = s.n; g.edges.length = s.e;
  for (let i = 0; i < s.n; i++) g.adj[i].length = s.adj[i];
}

/** Junctions that can still take another path. */
export const openNodes = (g: Graph) => g.nodes.map((_, i) => i).filter(i => g.adj[i].length < g.cfg.maxDegree);
export const near = (g: Graph, a: number, b: number) =>
  Math.hypot(g.nodes[b].c - g.nodes[a].c, g.nodes[b].r - g.nodes[a].r) <= g.cfg.reach;
export const minDegreeOf = (g: Graph) => g.adj.reduce((m, a) => Math.min(m, a.length), Infinity);
