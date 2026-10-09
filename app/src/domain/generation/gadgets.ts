/* The building blocks a level is grown from, and the menu each difficulty
   draws them from. Internal to generation/ except the names and menus. */
import { pick, ri } from '../rng';
import type { Rng } from '../types';
import { OFFS, addEdge, addNode, openNodes, restore, snapshot, type Graph } from './builder';

/** cells: relative lattice cells; links: internal edges; conn: index of cell wired to the anchor */
interface Gadget { cells: [number, number][]; links: [number, number][]; conn: number; tag: string }

export const GADGETS = {
  // degree-1 spur: one junction hanging off an existing one
  spur: { cells: [[0, 0]], links: [], conn: 0, tag: 'leaf' },
  // forced hub: a centre with two leaves -> the centre is forced
  hub: { cells: [[0, 0], [1, 0], [0, 1]], links: [[0, 1], [0, 2]], conn: 0, tag: 'leaf' },
  // odd path (P5-style run) -> needs degree-2 folding
  path3: { cells: [[0, 0], [1, 0], [2, 0]], links: [[0, 1], [1, 2]], conn: 0, tag: 'path' },
  path4: { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], links: [[0, 1], [1, 2], [2, 3]], conn: 0, tag: 'path' },
  path5: { cells: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]], links: [[0, 1], [1, 2], [2, 3], [3, 4]], conn: 0, tag: 'path' },
  // crown: three junctions sharing two neighbours -> both neighbours forced
  crown: {
    cells: [[0, 0], [1, 0], [2, 0], [1, -1], [1, 1]],
    links: [[0, 1], [0, 3], [0, 4], [2, 1], [2, 3], [2, 4]], conn: 4, tag: 'crown',
  },
  // small even cycle -> ambiguous alone, needs company
  ring4: { cells: [[0, 0], [1, 0], [1, 1], [0, 1]], links: [[0, 1], [1, 2], [2, 3], [3, 0]], conn: 0, tag: 'ring' },
  ring6: {
    cells: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]], conn: 0, tag: 'ring',
  },
} satisfies Record<string, Gadget>;
export type GadgetName = keyof typeof GADGETS;
export const GADGET_NAMES = Object.keys(GADGETS) as GadgetName[];
export const isGadget = (k: string): k is GadgetName => Object.hasOwn(GADGETS, k);

const MENU: Record<number, GadgetName[]> = {
  1: ['spur', 'spur', 'hub', 'hub', 'path3'],
  2: ['path3', 'path4', 'path5', 'spur', 'hub', 'ring4'],
  3: ['crown', 'crown', 'ring6', 'ring4', 'path4', 'path5', 'hub', 'spur'],
};
/** The gadget menu a difficulty grows from (duplicates are weights). */
export const menuFor = (diff: number): GadgetName[] => MENU[diff].slice();

function xform(cell: [number, number], rot: number, flip: boolean): [number, number] {
  let [c, r] = cell;
  if (flip) c = -c;
  for (let i = 0; i < rot; i++) { const t = c; c = -r; r = t; }
  return [c, r];
}

export function placeGadget(g: Graph, rng: Rng, gname: GadgetName) {
  const G: Gadget = GADGETS[gname];
  const anchors = openNodes(g);
  if (!anchors.length) return false;
  for (let att = 0; att < 24; att++) {
    const A = pick(rng, anchors);
    const rot = ri(rng, 4), flip = rng() < 0.5;
    const off = pick(rng, OFFS);
    const cells = G.cells.map(c => xform(c, rot, flip));
    const target = [g.nodes[A].c + off[0], g.nodes[A].r + off[1]];
    const dx = target[0] - cells[G.conn][0], dy = target[1] - cells[G.conn][1];
    const snap = snapshot(g);
    const ids: number[] = [];
    let ok = true;
    for (const [c, r] of cells) {
      const id = addNode(g, c + dx, r + dy);
      if (id < 0) { ok = false; break; }
      ids.push(id);
    }
    if (ok) for (const [a, b] of G.links) if (!addEdge(g, ids[a], ids[b])) { ok = false; break; }
    if (ok) ok = addEdge(g, A, ids[G.conn]);
    if (ok) return true;
    restore(g, snap);
  }
  return false;
}
