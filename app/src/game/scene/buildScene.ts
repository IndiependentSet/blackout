import { BREEDS, type Breed } from '../../assets/cats';
import { THINGS, type Thing } from '../../assets/things';
import { coveredEdges } from '../../domain/cover';
import type { Hint } from '../../domain/types';
import { CAT_FOOT, CAT_TOP, THING_FOOT } from '../../sprites';
import { CAT_S, MAP_H, MAP_W, THING_S } from '../constants';
import type { Layout } from '../layout/layout';
import { cable } from './cable';
import type { Bounds } from './view';

export interface PathItem { key: number; d: string; lit: boolean; bounds: Bounds }

interface SpriteBase { key: string; x: number; y: number; scale: number; base: number; bounds: Bounds }
export interface ThingItem extends SpriteBase { kind: 'thing'; thing: Thing; smashed: boolean; index: number }
export interface PadItem extends SpriteBase {
  kind: 'pad'; node: number; breed: Breed; hired: boolean; pulsing: boolean; focused: boolean;
}
export type SpriteItem = ThingItem | PadItem;

export interface Scene {
  /** every path, in edge order */
  paths: PathItem[];
  /** the "estimate" hint's matching, drawn over the paths */
  proof: { key: number; d: string }[];
  /** cats and smashables, already depth-sorted: whoever stands further back first */
  sprites: SpriteItem[];
}

export interface SceneInput {
  layout: Layout;
  /** which site this is: shifts the whole cast of cats so each house has its own line-up */
  siteIdx: number;
  placed: number[];
  hint: Hint | null;
  focus: number;
  /** only show the focus ring once the keyboard has been used */
  kbd: boolean;
}

const PATH_MARGIN = 60;

/* Everything that depends on the game but not on where the camera is. Culling
   against the frame happens per frame in the view layer, so panning never
   rebuilds this. */
export function buildScene({ layout, siteIdx, placed, hint, focus, kbd }: SceneInput): Scene {
  const { lv, pos, plan } = layout;
  const hired = new Set(placed);
  const lit = coveredEdges(lv, placed);

  const paths: PathItem[] = [];
  const sprites: SpriteItem[] = [];

  lv.edges.forEach(([u, v], i) => {
    const on = lit.has(i);
    /* draw from the pad that was hired first, so the colour runs outward from it */
    const ou = hired.has(u) ? placed.indexOf(u) : -1, ov = hired.has(v) ? placed.indexOf(v) : -1;
    const flip = ov > ou;
    const A = pos[flip ? v : u], B = pos[flip ? u : v];
    const bounds: Bounds = [
      Math.min(A.x, B.x) - PATH_MARGIN, Math.min(A.y, B.y) - PATH_MARGIN,
      Math.max(A.x, B.x) + PATH_MARGIN, Math.max(A.y, B.y) + PATH_MARGIN,
    ];
    const c = cable(A, B);
    paths.push({ key: i, d: c.d, lit: on, bounds });
    sprites.push({
      kind: 'thing', key: 't' + i, x: c.mx, y: c.my, scale: THING_S, base: c.my + THING_FOOT * THING_S, bounds,
      thing: THINGS[plan.edgeThing[i]] || THINGS[(u * 7 + v * 3 + i) % THINGS.length],
      smashed: on, index: i,
    });
  });

  lv.nodes.forEach((_, i) => {
    const p = pos[i];
    /* 5 is coprime with the breed count, so neighbouring cats differ */
    const breed = BREEDS[(i * 5 + siteIdx * 2) % BREEDS.length];
    const pointedAt = !!hint && (
      (hint.kind === 'leaf' && (i === hint.leaf || i === hint.forced))
      || (hint.kind === 'reveal' && i === hint.node));
    sprites.push({
      kind: 'pad', key: 'n' + i, node: i, x: p.x, y: p.y, scale: CAT_S, base: p.y + CAT_FOOT * CAT_S,
      bounds: [p.x - 40, p.y + CAT_TOP * CAT_S, p.x + 40, p.y + 30],
      breed, hired: hired.has(i), pulsing: pointedAt, focused: kbd && i === focus,
    });
  });

  /* painter's order; Array.prototype.sort is stable, so ties keep edge-then-node order */
  sprites.sort((a, b) => a.base - b.base);

  const proof = hint && hint.kind === 'proof'
    ? hint.edges.map(i => {
      const [u, v] = lv.edges[i];
      return { key: i, d: cable(pos[u], pos[v]).d };
    })
    : [];

  return { paths, proof, sprites };
}

/* ---- minimap ---- */

export interface Minimap {
  w: number;
  h: number;
  /** minimap units per world unit */
  k: number;
  rooms: { key: number; x: number; y: number; w: number; h: number }[];
  edges: { key: number; x1: number; y1: number; x2: number; y2: number; on: boolean }[];
  nodes: { key: number; x: number; y: number; on: boolean }[];
  /** minimap point -> world point */
  toWorld: (mx: number, my: number) => { x: number; y: number };
  /** world rect -> minimap rect */
  rect: (r: { x: number; y: number; w: number; h: number }) => { x: number; y: number; w: number; h: number };
}

/* The floorplan in miniature: once the board is a warren of rooms, the room
   boxes are what tell you where in the house you are. */
export function buildMinimap(layout: Layout, placed: number[]): Minimap {
  const { lv, pos, plan, content: W } = layout;
  const k = Math.min(MAP_W / W.w, MAP_H / W.h);
  const hired = new Set(placed);
  const lit = coveredEdges(lv, placed);
  const px = (q: { x: number; y: number }) => ({ x: (q.x - W.x) * k, y: (q.y - W.y) * k });
  return {
    w: W.w * k, h: W.h * k, k,
    rooms: plan.rooms.map(r => ({ key: r.id, x: (r.x - W.x) * k, y: (r.y - W.y) * k, w: r.w * k, h: r.h * k })),
    edges: lv.edges.map(([u, v], i) => {
      const a = px(pos[u]), b = px(pos[v]);
      return { key: i, x1: a.x, y1: a.y, x2: b.x, y2: b.y, on: lit.has(i) };
    }),
    nodes: pos.map((q, i) => ({ key: i, ...px(q), on: hired.has(i) })),
    toWorld: (mx, my) => ({ x: W.x + mx / k, y: W.y + my / k }),
    rect: r => ({ x: (r.x - W.x) * k, y: (r.y - W.y) * k, w: r.w * k, h: r.h * k }),
  };
}

/** Does the frame already show the whole building? Then a minimap earns nothing. */
export function viewCoversContent(view: { x: number; y: number; w: number; h: number }, C: Layout['content']): boolean {
  return view.x <= C.x + 1 && view.y <= C.y + 1 && view.x + view.w >= C.x + C.w - 1 && view.y + view.h >= C.y + C.h - 1;
}
