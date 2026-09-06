/*
 * CATASTROPHE INC. floorplan: the house the puzzle sits in.
 *
 * The building is a grid of drawn rooms. Every level is a planar graph on
 * integer lattice cells, so the plan can be derived from it rather than
 * authored: cut the node bounding box into TILE-by-TILE blocks, give each
 * block a room, and let the art carry the walls, the floor and the furniture
 * (`assets/rooms/`). A block is squared on the lattice, so a pad always lands
 * half a cell — 65 world units — inside its room and can never sit on a wall.
 *
 * Pure and framework-free, like engine.js: the module works in lattice units
 * and multiplies by `spacing` once, on the way out, so the caller gets a
 * render-ready plan in world units and never does geometry per frame.
 * Deterministic — the only randomness is engine.js's seeded RNG, fed by a
 * seed folded out of the level's own coordinates.
 *
 * Paths cross walls freely; nothing in the puzzle depends on this file.
 */
import { rngFromSeed } from './engine.js';

export const HOUSE = {
  TILE: 2,          // lattice cells per room, square — up to 4 pads a room
  MIN_GRID: 2,      // ...and never fewer rooms than this on a side, or a flat
                    // level comes out a row of rooms instead of a house
  SEAM: 1.5,        // world units of overdraw, so tiles butt without a hairline
  REPEAT_PEN: 0.12, // how hard a room type is pushed away from its own kind
  SHARE_PEN: 5,     // ...and away from taking over the whole house
  SAG_K: 0.1,       // mirrors CABLE_SAG in CatCoverGame.jsx
  SAG_C: 3,         // mirrors the +3 in cable(); world units
};
const H = HOUSE;

/* how often a type comes up before the penalties below have their say */
const WEIGHT = {
  living: 3, bedroom: 3, kitchen: 2, bath: 2,
  study: 2, nursery: 1, hall: 1, storage: 1,
};
/* used when there is no art at all yet, so the fallback rooms still vary */
export const DEFAULT_TYPES = ['living', 'kitchen', 'bedroom', 'bath', 'study'];

/* which smashables belong in which room */
export const ROOM_THINGS = {
  kitchen: ['mug', 'can', 'pot', 'plant', 'clock'],
  bath: ['toilet-paper', 'vase', 'fishbowl', 'mug'],
  bedroom: ['pillow', 'lamp', 'books', 'clock', 'petbed'],
  living: ['vase', 'lamp', 'fishbowl', 'books', 'plant', 'clock'],
  study: ['books', 'lamp', 'mug', 'clock', 'plant'],
  nursery: ['ball', 'mouse', 'yarn', 'fishtoy', 'pillow'],
  hall: ['box', 'crate', 'plant', 'vase'],
  storage: ['box', 'crate', 'can', 'yarn', 'petbed'],
};

export function latticeOrigin(lv) {
  let c0 = Infinity, r0 = Infinity, c1 = -Infinity, r1 = -Infinity;
  for (const n of lv.nodes) {
    if (n.c < c0) c0 = n.c;
    if (n.c > c1) c1 = n.c;
    if (n.r < r0) r0 = n.r;
    if (n.r > r1) r1 = n.r;
  }
  return { c0, r0, w: Math.max(1, c1 - c0 + 1), h: Math.max(1, r1 - r0 + 1) };
}

/* a seed from the level's own contents: layout() runs during render and for
   levels other than the current one, so it can't reach for the day or the
   site index without becoming order-dependent */
export function houseSeed(lv) {
  let h = 0x811c9dc5;
  const mix = v => { h = Math.imul(h ^ (v & 0xffff), 0x01000193) >>> 0; };
  mix(lv.nodes.length); mix(lv.edges.length); mix(lv.k);
  for (const n of lv.nodes) { mix(n.c + 512); mix(n.r + 512); }
  for (const [a, b] of lv.edges) { mix(a); mix(b); }
  return h >>> 0;
}

/* Deal a room to every tile. Two houses on two days should not look like the
   same house, so a type is pushed away from its own neighbours and away from
   taking more than its share of the plan; what's left is a seeded draw. */
function dealRooms(grid, gw, gh, types, rng) {
  const used = {};
  const total = gw * gh;
  for (let i = 0; i < grid.length; i++) {
    const t = grid[i];
    const left = t.gx > 0 ? grid[i - 1].type : null;
    const up = t.gy > 0 ? grid[i - gw].type : null;
    let sum = 0;
    const score = types.map(type => {
      let s = WEIGHT[type] || 1;
      if (type === left || type === up) s *= H.REPEAT_PEN;
      s /= 1 + ((used[type] || 0) * H.SHARE_PEN) / total;
      sum += s;
      return s;
    });
    let at = rng() * sum, type = types[types.length - 1];
    for (let j = 0; j < types.length; j++) { at -= score[j]; if (at <= 0) { type = types[j]; break; } }
    t.type = type;
    used[type] = (used[type] || 0) + 1;
  }
}

export function buildHouse(lv, seed, spacing, thingNames, artTypes) {
  const rng = rngFromSeed(seed);
  const o = latticeOrigin(lv);
  const pts = lv.nodes.map(n => ({ x: n.c - o.c0, y: n.r - o.r0 }));
  const T = H.TILE;
  const types = artTypes && artTypes.length ? artTypes.slice() : DEFAULT_TYPES;

  /* The grid, in lattice units: a tile covers T cells each way, so a pad sits
     half a cell inside its room however the graph fell. A house too flat to
     read as one is padded out with spare rooms, centred on the pads. */
  const nw = Math.ceil(o.w / T), nh = Math.ceil(o.h / T);
  const gw = Math.max(H.MIN_GRID, nw), gh = Math.max(H.MIN_GRID, nh);
  const ox = Math.floor((gw - nw) / 2), oy = Math.floor((gh - nh) / 2);
  const grid = [];
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++)
      grid.push({ id: grid.length, gx, gy, ids: [] });

  const roomOfNode = new Int16Array(lv.nodes.length).fill(-1);
  pts.forEach((p, i) => {
    const gx = ox + Math.min(nw - 1, Math.floor(p.x / T));
    const gy = oy + Math.min(nh - 1, Math.floor(p.y / T));
    const id = gy * gw + gx;
    roomOfNode[i] = id;
    grid[id].ids.push(i);
  });

  dealRooms(grid, gw, gh, types, rng);

  const S = spacing, side = T * S;
  /* world origin stays on the pads: the spare rooms grow around them */
  const fx = (-ox * T - 0.5) * S, fy = (-oy * T - 0.5) * S;
  const foot = { x: fx, y: fy, w: gw * side, h: gh * side };
  const plan = {
    foot,
    outer: foot,
    tile: side,
    rooms: grid.map(t => {
      const x = fx + t.gx * side, y = fy + t.gy * side;
      return {
        id: t.id, type: t.type, ids: t.ids,
        /* the renderer picks the picture: house.js stays clear of the assets */
        variant: Math.floor(rng() * 997),
        /* mirroring a top-down room is free variety — the art is lit from
           above, so left-to-right is the one flip that stays believable */
        flip: rng() < 0.5,
        x, y, w: side, h: side, cx: x + side / 2, cy: y + side / 2,
      };
    }),
    roomOfNode,
    edgeThing: null,
  };
  plan.edgeThing = pickThings(plan, lv, pts, S, thingNames);
  return plan;
}

/* which smashable sits on each path — the room it hangs in picks it, so the
   toilet roll stops turning up in the kitchen. Cosmetic only. */
function pickThings(plan, lv, pts, S, thingNames) {
  const out = new Int16Array(lv.edges.length);
  const names = thingNames || [];
  lv.edges.forEach(([u, v], i) => {
    let idx = names.length ? (u * 7 + v * 3 + i) % names.length : 0;
    const mx = (pts[u].x + pts[v].x) / 2 * S;
    const sag = Math.abs(pts[v].x - pts[u].x) * S * H.SAG_K + H.SAG_C;
    const my = (pts[u].y + pts[v].y) / 2 * S + sag / 2;
    const room = roomAt(plan, mx, my);
    if (room >= 0 && names.length) {
      const list = ROOM_THINGS[plan.rooms[room].type];
      if (list && list.length) {
        const at = names.indexOf(list[(u * 7 + v * 3 + i) % list.length]);
        if (at >= 0) idx = at;
      }
    }
    out[i] = idx;
  });
  return out;
}

export function roomAt(plan, x, y) {
  for (const r of plan.rooms)
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
  return -1;
}
