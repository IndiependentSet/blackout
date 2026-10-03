/*
 * CATASTROPHE INC. floorplan: the house the puzzle sits in.
 *
 * Every level is a planar graph on integer lattice cells, so the building can
 * be derived from it rather than authored. A seeded BSP cuts the node bounding
 * box into rooms 2 or 3 cells a side, and each room is then matched to one of
 * the drawn rooms in `assets/rooms/` — walls, floor and furniture all baked
 * into the art. Wall lines land on HALF-integers, so a pad always sits half a
 * cell (65 world units) inside its room and can never end up on a wall.
 *
 * Because the art is fixed, the variety has to come from the arrangement: the
 * split lines, which picture fills which room, and a horizontal mirror. Rooms
 * are matched on shape, so a tall room gets a tall picture and the art is
 * never stretched far.
 *
 * Pure and framework-free, like engine.js: lattice units throughout, scaled by
 * `spacing` once on the way out, so the caller gets a render-ready plan and
 * never does geometry per frame. Deterministic — the only randomness is
 * engine.js's seeded RNG, fed by a seed folded out of the level's own
 * coordinates.
 *
 * Paths cross walls freely; nothing in the puzzle depends on this file.
 */
import { rngFromSeed } from './engine';
import type { CatalogueEntry, HousePlan, Level, Point, Rect, Rng } from './types';

/** A room while the BSP is still cutting; `type`/`art` are dealt afterwards. */
interface BspRoom { rect: Rect; ids: number[]; mids: Point[]; pts: Point[]; type?: string; art?: string }

export const HOUSE = {
  MIN_ROOM: 2,    // cells: a room is 2 or 3 cells a side, so furniture drawn
  MAX_ROOM: 3,    // into it stays roughly one size across the whole house
  SEAM: 1.5,      // world units of overdraw, so rooms butt without a hairline
  CONTENT_GAP: 0.5, // floor a room keeps around the last thing standing in it
  WALL_GAP: 0.18, // an object this close to a cut doesn't count as being in
                  // either room — it would be drawn half inside the wall
  SHAPE_TOL: 0.26, // a picture may be stretched this far (~30%); tighter and
                   // the tall rooms run out of pictures and start repeating
  SHAPE_W: 1.6,   // how hard a closer shape is still preferred inside that
  SHARE_W: 1.6,   // ...how hard one room type is stopped from taking over
  REPEAT_W: 1.3,  // ...and pushed away from its own neighbours
  AGAIN_W: 1.4,   // ...and the same picture from being used twice
  SAG_K: 0.1,     // how far a drawn path sags per unit of width — game/scene/cable.ts
  SAG_C: 3,       // ...and the constant on top of it; world units
};
const H = HOUSE;

/* which smashables belong in which room */
export const ROOM_THINGS: Record<string, string[]> = {
  kitchen: ['mug', 'can', 'pot', 'plant', 'clock'],
  dining: ['mug', 'vase', 'can', 'books', 'clock'],
  bath: ['toilet-paper', 'vase', 'fishbowl', 'mug'],
  bedroom: ['pillow', 'lamp', 'books', 'clock', 'petbed'],
  living: ['vase', 'lamp', 'fishbowl', 'books', 'plant', 'clock'],
  study: ['books', 'lamp', 'mug', 'clock', 'plant'],
  nursery: ['ball', 'mouse', 'yarn', 'fishtoy', 'pillow'],
  music: ['vase', 'lamp', 'books', 'clock', 'plant'],
  plants: ['plant', 'pot', 'vase', 'fishbowl', 'can'],
  laundry: ['box', 'crate', 'can', 'yarn', 'petbed'],
  workshop: ['crate', 'box', 'can', 'clock', 'yarn'],
  hall: ['box', 'crate', 'plant', 'vase'],
  storage: ['box', 'crate', 'can', 'yarn', 'petbed'],
};
/* stands in for the catalogue when no art has been prepared yet */
const PLAIN: CatalogueEntry[] = [
  { key: 'living', type: 'living', aspect: 1 }, { key: 'kitchen', type: 'kitchen', aspect: 1 },
  { key: 'bedroom', type: 'bedroom', aspect: 1 }, { key: 'bath', type: 'bath', aspect: 0.7 },
  { key: 'study', type: 'study', aspect: 1 }, { key: 'hall', type: 'hall', aspect: 0.7 },
];

const aspectOf = (r: Rect) => r.w / r.h;

/* where each path hangs its smashable, in lattice units — a room earns its
   place by holding at least one of these */
function midpoints(lv: Level, pts: Point[], spacing: number): Point[] {
  return lv.edges.map(([u, v]) => ({
    x: (pts[u].x + pts[v].x) / 2,
    y: (pts[u].y + pts[v].y) / 2
      + (Math.abs(pts[v].x - pts[u].x) * H.SAG_K) / 2 + H.SAG_C / (2 * spacing),
  }));
}

export function latticeOrigin(lv: Level) {
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
export function houseSeed(lv: Level): number {
  let h = 0x811c9dc5;
  const mix = (v: number) => { h = Math.imul(h ^ (v & 0xffff), 0x01000193) >>> 0; };
  mix(lv.nodes.length); mix(lv.edges.length); mix(lv.k);
  for (const n of lv.nodes) { mix(n.c + 512); mix(n.r + 512); }
  for (const [a, b] of lv.edges) { mix(a); mix(b); }
  return h >>> 0;
}

/* ---------- the partition ---------- */
/* wall lines sit on half-integers, and every room they leave behind is at
   least MIN_ROOM cells wide, so a pad is never closer than half a cell */
function candidates(lo: number, len: number) {
  const out: number[] = [];
  for (let k = H.MIN_ROOM; k <= len - H.MIN_ROOM; k++) out.push(lo + k);
  return out;
}

/* how many paths straddle a line — walls prefer to fall where the graph is
   sparse, which is what makes rooms hold clusters of pads */
function crossings(pts: Point[], edges: [number, number][], vert: boolean, t: number, o0: number, o1: number) {
  let n = 0;
  for (const [a, b] of edges) {
    const pa = vert ? pts[a].x : pts[a].y, pb = vert ? pts[b].x : pts[b].y;
    if ((pa < t) === (pb < t)) continue;
    const m = ((vert ? pts[a].y : pts[a].x) + (vert ? pts[b].y : pts[b].x)) / 2;
    if (m >= o0 && m <= o1) n++;
  }
  return n;
}

/* how far a room's shape is from the nearest picture that could fill it —
 * this is what keeps the art from being stretched */
function shapeMiss(shapes: number[], w: number, h: number) {
  let best = Infinity;
  const a = w / h;
  for (const s of shapes) best = Math.min(best, Math.abs(Math.log(s / a)));
  return best;
}

/* `keep` is what both halves of a cut have to end up with: the objects on the
   paths, or — only for a room too big to leave alone — at least a pad each */
function pickLine(rect: Rect, ids: number[], mids: Point[], pts: Point[], edges: [number, number][], vert: boolean, rng: Rng, shapes: number[], keep: 'object' | 'pad') {
  const lo = vert ? rect.x : rect.y, len = vert ? rect.w : rect.h;
  const o0 = vert ? rect.y : rect.x, o1 = o0 + (vert ? rect.h : rect.w);
  let best: { t: number; s: number } | null = null;
  for (const t of candidates(lo, len)) {
    /* a room with nothing in it has no reason to exist, so a cut that leaves
       one side empty is not a cut we can make */
    let mL = 0, mR = 0;
    for (const m of mids) {
      const at = vert ? m.x : m.y;
      if (at < t - H.WALL_GAP) mL++; else if (at > t + H.WALL_GAP) mR++;
    }
    let nL = 0;
    for (const i of ids) if ((vert ? pts[i].x : pts[i].y) < t) nL++;
    const nR = ids.length - nL;
    if (keep === 'object' ? (!mL || !mR) : (!nL || !nR)) continue;
    const cut = t - lo, rest = len - cut;
    const A = vert ? { w: cut, h: rect.h } : { w: rect.w, h: cut };
    const B = vert ? { w: rest, h: rect.h } : { w: rect.w, h: rest };
    const s = 1.6 * Math.abs(nL - nR) / Math.max(1, ids.length)
      + 1.4 * Math.abs(mL - mR) / Math.max(1, mids.length)
      + 0.8 * crossings(pts, edges, vert, t, o0, o1)
      + 5.5 * (shapeMiss(shapes, A.w, A.h) + shapeMiss(shapes, B.w, B.h))
      + rng() * 0.5;
    if (!best || s < best.s) best = { t, s };
  }
  return best;
}

function partition(foot: Rect, pts: Point[], mids: Point[], edges: [number, number][], rng: Rng, shapes: number[]) {
  const rooms: BspRoom[] = [];
  const rec = (rect: Rect, ids: number[], mine: Point[]): void => {
    const leaf = () => rooms.push({ rect, ids, mids: mine, pts });
    const bigV = rect.w > H.MAX_ROOM, bigH = rect.h > H.MAX_ROOM;
    if (!bigV && !bigH) { leaf(); return; }
    /* try the axis that needs cutting first, then the other one: a room too
       big to leave alone is worth splitting the short way if that is the only
       cut that keeps an object on both sides */
    const first = bigV && bigH ? (rect.w === rect.h ? rng() < 0.5 : rect.w > rect.h) : bigV;
    let vert = first, best: { t: number; s: number } | null = null;
    /* objects on both sides is what we want; a pad each is what we settle for
       rather than leave a room the size of four */
    for (const keep of ['object', 'pad'] as const) {
      for (const v of [first, !first]) {
        best = pickLine(rect, ids, mine, pts, edges, v, rng, shapes, keep);
        if (best) { vert = v; break; }
      }
      if (best) break;
    }
    if (!best) { leaf(); return; }
    const t = best.t;
    const A = vert ? { x: rect.x, y: rect.y, w: t - rect.x, h: rect.h }
      : { x: rect.x, y: rect.y, w: rect.w, h: t - rect.y };
    const B = vert ? { x: t, y: rect.y, w: rect.x + rect.w - t, h: rect.h }
      : { x: rect.x, y: t, w: rect.w, h: rect.y + rect.h - t };
    const side = (p: Point) => (vert ? p.x : p.y) < t;
    rec(A, ids.filter(i => side(pts[i])), mine.filter(side));
    rec(B, ids.filter(i => !side(pts[i])), mine.filter(m => !side(m)));
  };
  rec(foot, pts.map((_, i) => i), mids);
  return rooms;
}

/* A room too big for the art that will fill it, whose contents sit in one
   corner, is mostly floor nobody visits. Pull its outer walls in to what it
   actually holds — but only at a corner of the house, and only when there is
   a whole empty cell to win. Bite anywhere else and the missing floor reads
   as a hole in the middle of the building rather than an L-shaped plan. */
function trimToContent(rooms: BspRoom[], foot: Rect) {
  const eps = 1e-6;
  const wallAt = (v: number) => Math.floor(v - 0.5) + 0.5;   // nearest half-integer below
  for (const r of rooms) {
    const held = r.ids.map(i => r.pts[i]).concat(r.mids);
    if (!held.length) continue;
    const xs = held.map(p => p.x), ys = held.map(p => p.y);
    const R = r.rect, G = H.CONTENT_GAP;
    const onL = R.x <= foot.x + eps, onR = R.x + R.w >= foot.x + foot.w - eps;
    const onT = R.y <= foot.y + eps, onB = R.y + R.h >= foot.y + foot.h - eps;
    if (R.w > H.MAX_ROOM && (onT || onB)) {
      if (onL) {
        const w = Math.min(wallAt(Math.min(...xs) - G), R.x + R.w - H.MIN_ROOM);
        if (w >= R.x + 1) { R.w -= w - R.x; R.x = w; }
      }
      if (onR) {
        const w = Math.max(-wallAt(-(Math.max(...xs) + G)), R.x + H.MIN_ROOM);
        if (w <= R.x + R.w - 1) R.w = w - R.x;
      }
    }
    if (R.h > H.MAX_ROOM && (onL || onR)) {
      if (onT) {
        const w = Math.min(wallAt(Math.min(...ys) - G), R.y + R.h - H.MIN_ROOM);
        if (w >= R.y + 1) { R.h -= w - R.y; R.y = w; }
      }
      if (onB) {
        const w = Math.max(-wallAt(-(Math.max(...ys) + G)), R.y + H.MIN_ROOM);
        if (w <= R.y + R.h - 1) R.h = w - R.y;
      }
    }
  }
}

/* ---------- which picture goes where ---------- */
const touching = (a: Rect, b: Rect) =>
  a.x < b.x + b.w + 1e-6 && b.x < a.x + a.w + 1e-6 &&
  a.y < b.y + b.h + 1e-6 && b.y < a.y + a.h + 1e-6;

/* Two houses on two days shouldn't look like the same house: a picture is
   chosen for its shape first, then pushed away from its own kind next door,
   away from taking more than its share, and away from being used twice. */
function dealArt(rooms: BspRoom[], cat: CatalogueEntry[], rng: Rng) {
  const used: Record<string, number> = {}, again: Record<string, number> = {};
  const share = Math.max(1, rooms.length / 3);
  rooms.forEach((room, i) => {
    const near: (string | undefined)[] = [];
    for (let j = 0; j < i; j++) if (touching(rooms[j].rect, room.rect)) near.push(rooms[j].type);
    const a = aspectOf(room.rect);
    /* shape first, and as a filter rather than a score: a bathroom squeezed
       into a room the wrong shape reads as a mistake, however varied it is */
    const fits = cat.filter(e => Math.abs(Math.log(e.aspect / a)) <= H.SHAPE_TOL);
    let best: { s: number; e: CatalogueEntry } | null = null;
    for (const e of (fits.length ? fits : cat)) {
      const s = H.SHAPE_W * Math.abs(Math.log(e.aspect / a))
        + H.SHARE_W * ((used[e.type] || 0) / share)
        + H.AGAIN_W * (again[e.key] || 0)
        + (near.includes(e.type) ? H.REPEAT_W : 0)
        + rng() * 0.45;
      if (!best || s < best.s) best = { s, e };
    }
    if (!best) throw new Error('house: empty room catalogue');
    room.type = best.e.type;
    room.art = best.e.key;
    used[best.e.type] = (used[best.e.type] || 0) + 1;
    again[best.e.key] = (again[best.e.key] || 0) + 1;
  });
}

/* ---------- build ---------- */
export function buildHouse(lv: Level, seed: number, spacing: number, thingNames: string[] | null | undefined, catalogue?: CatalogueEntry[] | null): HousePlan {
  const rng = rngFromSeed(seed);
  const o = latticeOrigin(lv);
  const pts = lv.nodes.map(n => ({ x: n.c - o.c0, y: n.r - o.r0 }));
  const cat = catalogue && catalogue.length ? catalogue : PLAIN;
  const shapes = cat.map(e => e.aspect);

  /* the footprint is the pads' own bounding box and nothing more: padding it
     out only ever buys rooms with nothing in them */
  const foot = { x: -0.5, y: -0.5, w: o.w, h: o.h };
  const mids = midpoints(lv, pts, spacing);

  const rooms = partition(foot, pts, mids, lv.edges, rng, shapes);
  trimToContent(rooms, foot);
  dealArt(rooms, cat, rng);

  const S = spacing;
  /* what the camera frames is the building that survived the trim, not the
     bounding box it was cut from */
  const box = rooms.reduce((b, r) => ({
    x0: Math.min(b.x0, r.rect.x), y0: Math.min(b.y0, r.rect.y),
    x1: Math.max(b.x1, r.rect.x + r.rect.w), y1: Math.max(b.y1, r.rect.y + r.rect.h),
  }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  const shell = { x: box.x0 * S, y: box.y0 * S, w: (box.x1 - box.x0) * S, h: (box.y1 - box.y0) * S };

  const roomOfNode = new Int16Array(lv.nodes.length).fill(-1);
  rooms.forEach((r, id) => r.ids.forEach(i => { roomOfNode[i] = id; }));

  const plan: HousePlan = {
    foot: shell, outer: shell,
    rooms: rooms.map((r, id) => ({
      id, type: r.type as string, art: r.art as string,
      /* mirroring a top-down room is free variety — the art is lit from
         above, so left-to-right is the one flip that stays believable */
      flip: rng() < 0.5,
      x: r.rect.x * S, y: r.rect.y * S, w: r.rect.w * S, h: r.rect.h * S,
      cx: (r.rect.x + r.rect.w / 2) * S, cy: (r.rect.y + r.rect.h / 2) * S,
    })),
    roomOfNode,
    edgeThing: new Int16Array(0),
  };
  plan.edgeThing = pickThings(plan, lv, pts, S, thingNames);
  return plan;
}


/* which smashable sits on each path — the room it hangs in picks it, so the
   toilet roll stops turning up in the kitchen. Cosmetic only. */
function pickThings(plan: HousePlan, lv: Level, pts: Point[], S: number, thingNames: string[] | null | undefined) {
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

export function roomAt(plan: Pick<HousePlan, 'rooms'>, x: number, y: number) {
  for (const r of plan.rooms)
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
  return -1;
}
