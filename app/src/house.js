/*
 * CATASTROPHE INC. floorplan: turns a level's lattice into a house.
 *
 * Every level is a planar graph on integer lattice cells, so the building can
 * be derived from it rather than authored: split the node bounding box into
 * rooms with a seeded BSP, keep every wall centre-line on a HALF-integer
 * coordinate, and no wall can ever run through a pad or the cat standing on it
 * (half a cell is 65 world units; a cat is 28 wide and 35 tall above its node).
 *
 * Pure and framework-free, like engine.js — the module works in lattice units
 * throughout and multiplies by `spacing` exactly once, on the way out, so the
 * caller gets a render-ready plan in world units and never does geometry per
 * frame. Deterministic: the only randomness is engine.js's seeded RNG, fed by
 * a seed folded out of the level's own coordinates.
 *
 * Paths are allowed to cross walls — doorways here are decoration, so nothing
 * in the puzzle depends on this file.
 */
import { rngFromSeed } from './engine.js';

/* all lengths in lattice cells unless the comment says world units */
export const HOUSE = {
  OUTER_PAD: 1,       // house extends this far past the outermost pads
  WALL_T: 0.108,      // interior wall thickness (~14 world units)
  EXT_T: 0.17,        // exterior wall thickness (~22)
  MIN_ROOM: 1.5,      // no room side shorter than this
  MAX_DEPTH: 6,
  DOOR_HALF: 0.3,     // half the width of a doorway (~78 world units across)
  STUB_MIN: 0.35,     // no doorway closer than this to the end of a wall
  LONG_WALL: 4.2,     // walls longer than this get a second doorway
  FRONT_MULT: 1.5,    // the front door is wider than an interior one
  FURN_CLEAR: 0.42,   // furniture keeps this clear of a pad
  CABLE_CLEAR: 0.2,   // ...and of a path
  NODE_CLEAR: 0.3,    // dev assertion: walls stay this far off a pad
  SAG_K: 0.1,         // mirrors CABLE_SAG in CatCoverGame.jsx
  SAG_C: 3,           // mirrors the +3 in cable(); world units
};
const H = HOUSE;

/* the deck rooms are dealt from, largest room first */
/* maxArea matters as much as minArea: without it the biggest room on the plan
   comes out a broom cupboard, or half the house a bathroom */
const ROOM_KINDS = [
  { type: 'living', w: 3, minArea: 4, maxArea: 99, max: 2, floor: 'wood' },
  { type: 'kitchen', w: 2, minArea: 3, maxArea: 12, max: 1, floor: 'tile' },
  { type: 'bedroom', w: 3, minArea: 3, maxArea: 16, max: 3, floor: 'carpet' },
  { type: 'study', w: 2, minArea: 2.5, maxArea: 9, max: 1, floor: 'wood' },
  { type: 'bath', w: 2, minArea: 1.8, maxArea: 6.5, max: 2, floor: 'checker' },
  { type: 'nursery', w: 1, minArea: 2.5, maxArea: 8, max: 1, floor: 'carpet' },
  { type: 'storage', w: 1, minArea: 0, maxArea: 6, max: 2, floor: 'concrete' },
];
const FLOOR_OF = { hall: 'wood' };
ROOM_KINDS.forEach(k => { FLOOR_OF[k.type] = k.floor; });
/* a room with no pads in it should read as somewhere you'd expect to be empty */
const EMPTY_PREF = ['bath', 'storage', 'nursery'];

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

/* [kind, width, depth] — furniture stands with its back to a wall */
const FURNITURE = {
  living: [['sofa', 1.35, 0.62], ['table', 0.85, 0.6], ['shelf', 0.9, 0.3], ['plantpot', 0.42, 0.42]],
  kitchen: [['counter', 1.45, 0.52], ['sink', 0.55, 0.42], ['table', 0.8, 0.7]],
  bath: [['tub', 1.15, 0.6], ['toilet', 0.42, 0.5], ['sink', 0.5, 0.38]],
  bedroom: [['bed', 1.05, 1.3], ['shelf', 0.9, 0.3], ['plantpot', 0.42, 0.42]],
  study: [['desk', 1.15, 0.5], ['shelf', 1, 0.3], ['plantpot', 0.42, 0.42]],
  nursery: [['cot', 0.85, 0.95], ['shelf', 0.8, 0.3], ['plantpot', 0.42, 0.42]],
  storage: [['crate', 0.58, 0.58], ['shelf', 1, 0.3], ['crate', 0.46, 0.46]],
  hall: [['shelf', 0.9, 0.3], ['plantpot', 0.42, 0.42]],
};
const RUGS = { living: [1.5, 1.1], bedroom: [1.05, 0.85], nursery: [1, 1], study: [0.9, 0.7], hall: [0.65, 1.4] };

/* ---------- helpers ---------- */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
/* seeded Fisher-Yates: a random sort comparator is not stable across JS
   engines, and two players on the same day must get the same house */
const shuffled = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};
const aspect = r => Math.max(r.w / r.h, r.h / r.w) - 1;
const inRect = (r, x, y, pad) =>
  x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

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

/* ---------- the partition ---------- */
/* candidate wall lines sit on half-integers, so they never touch a pad */
function candidates(lo, len) {
  const out = [], hi = lo + len;
  for (let t = Math.floor(lo + H.MIN_ROOM) + 0.5; t <= hi - H.MIN_ROOM + 1e-9; t += 1)
    if (t >= lo + H.MIN_ROOM - 1e-9) out.push(t);
  return out;
}

/* how many paths straddle a line — walls prefer to fall where the graph is
   sparse, which is what makes rooms hold clusters of pads */
function crossings(pts, edges, vert, t, o0, o1) {
  let n = 0;
  for (const [a, b] of edges) {
    const pa = vert ? pts[a].x : pts[a].y, pb = vert ? pts[b].x : pts[b].y;
    if ((pa < t) === (pb < t)) continue;
    const m = ((vert ? pts[a].y : pts[a].x) + (vert ? pts[b].y : pts[b].x)) / 2;
    if (m >= o0 && m <= o1) n++;
  }
  return n;
}

function pickLine(rect, ids, pts, edges, vert, rng) {
  const lo = vert ? rect.x : rect.y, len = vert ? rect.w : rect.h;
  const o0 = vert ? rect.y : rect.x, o1 = o0 + (vert ? rect.h : rect.w);
  let best = null;
  for (const t of candidates(lo, len)) {
    let nL = 0;
    for (const i of ids) if ((vert ? pts[i].x : pts[i].y) < t) nL++;
    const nR = ids.length - nL;
    const cut = t - lo, rest = len - cut;
    if (nL === 0 || nR === 0) {
      /* an empty room is welcome now and then, but only a roomy one and only
         when the parent has pads to spare */
      const empty = nL === 0 ? cut : rest;
      const other = vert ? rect.h : rect.w;
      if (ids.length < 3 || empty < 2 || other < 2) continue;
    }
    const A = vert ? { w: cut, h: rect.h } : { w: rect.w, h: cut };
    const B = vert ? { w: rest, h: rect.h } : { w: rect.w, h: rest };
    const s = 3 * Math.abs(nL - nR) / Math.max(1, ids.length)
      + 1.2 * crossings(pts, edges, vert, t, o0, o1)
      + 0.7 * (aspect(A) + aspect(B))
      + rng() * 0.4;
    if (!best || s < best.s) best = { t, s };
  }
  return best;
}

function partition(foot, pts, edges, rng) {
  const rooms = [], walls = [];
  const rec = (rect, ids, depth) => {
    const canV = rect.w >= 2 * H.MIN_ROOM, canH = rect.h >= 2 * H.MIN_ROOM;
    const done = depth >= H.MAX_DEPTH || (!canV && !canH)
      || (ids.length <= 2 && rng() < 0.55)
      || (ids.length <= 4 && rect.w * rect.h < 6);
    if (done) { rooms.push({ rect, ids }); return; }
    let vert = canV && !canH ? true
      : canH && !canV ? false
      : rect.w > rect.h * 1.15 ? true
      : rect.h > rect.w * 1.15 ? false
      : rng() < 0.5;
    let best = pickLine(rect, ids, pts, edges, vert, rng);
    if (!best && ((vert && canH) || (!vert && canV))) { vert = !vert; best = pickLine(rect, ids, pts, edges, vert, rng); }
    if (!best) { rooms.push({ rect, ids }); return; }
    const t = best.t;
    walls.push(vert
      ? { dir: 'v', a: t, s0: rect.y, s1: rect.y + rect.h }
      : { dir: 'h', a: t, s0: rect.x, s1: rect.x + rect.w });
    const A = vert ? { x: rect.x, y: rect.y, w: t - rect.x, h: rect.h } : { x: rect.x, y: rect.y, w: rect.w, h: t - rect.y };
    const B = vert ? { x: t, y: rect.y, w: rect.x + rect.w - t, h: rect.h } : { x: rect.x, y: t, w: rect.w, h: rect.y + rect.h - t };
    const inA = ids.filter(i => (vert ? pts[i].x : pts[i].y) < t);
    const inB = ids.filter(i => (vert ? pts[i].x : pts[i].y) > t);
    rec(A, inA, depth + 1);
    rec(B, inB, depth + 1);
  };
  rec(foot, pts.map((_, i) => i), 0);
  return { rooms, walls };
}

/* ---------- room identities ---------- */
function typeRooms(rooms, frontId, rng) {
  const used = {};
  const order = rooms.map((r, i) => i).sort((a, b) => {
    const A = rooms[a].rect, B = rooms[b].rect;
    return (B.w * B.h) - (A.w * A.h) || a - b;
  });
  for (const i of order) {
    const room = rooms[i];
    if (i === frontId) { room.type = 'hall'; used.hall = (used.hall || 0) + 1; continue; }
    const area = room.rect.w * room.rect.h;
    let deck = ROOM_KINDS.filter(k => area >= k.minArea && area <= k.maxArea && (used[k.type] || 0) < k.max);
    if (!room.ids.length) {
      const pref = deck.filter(k => EMPTY_PREF.includes(k.type));
      if (pref.length) deck = pref;
    }
    if (!deck.length) {
      room.type = area >= 4 ? 'living' : 'storage';
      used[room.type] = (used[room.type] || 0) + 1;
      continue;
    }
    let total = 0;
    for (const k of deck) total += k.w;
    let pickAt = rng() * total, chosen = deck[deck.length - 1];
    for (const k of deck) { pickAt -= k.w; if (pickAt <= 0) { chosen = k; break; } }
    room.type = chosen.type;
    used[chosen.type] = (used[chosen.type] || 0) + 1;
  }
  rooms.forEach(r => { r.floor = FLOOR_OF[r.type]; });
}

/* ---------- doorways ---------- */
/* purely decorative: one opening per wall (two on a long one), dropped on a
   path crossing when there happens to be one so it reads as a doorway */
function openWall(wall, pts, edges, rng) {
  const span = wall.s1 - wall.s0;
  const lo = wall.s0 + H.STUB_MIN + H.DOOR_HALF, hi = wall.s1 - H.STUB_MIN - H.DOOR_HALF;
  wall.gaps = [];
  if (hi <= lo) return;
  const hits = [];
  for (const [a, b] of edges) {
    const A = pts[a], B = pts[b];
    const pa = wall.dir === 'v' ? A.x : A.y, pb = wall.dir === 'v' ? B.x : B.y;
    if ((pa < wall.a) === (pb < wall.a)) continue;
    const t = (wall.a - pa) / (pb - pa);
    const s = (wall.dir === 'v' ? A.y : A.x) + t * ((wall.dir === 'v' ? B.y : B.x) - (wall.dir === 'v' ? A.y : A.x));
    if (s >= lo && s <= hi) hits.push(s);
  }
  const at = [];
  const take = pool => {
    if (pool.length) return pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0];
    return lo + rng() * (hi - lo);
  };
  at.push(take(hits));
  if (span > H.LONG_WALL) {
    for (let t = 0; t < 6; t++) {
      const s = take(hits.length ? hits : []);
      if (Math.abs(s - at[0]) > 2 * H.DOOR_HALF + 0.8) { at.push(s); break; }
    }
  }
  at.sort((a, b) => a - b);
  wall.gaps = at.map(s => ({ t0: s - H.DOOR_HALF, t1: s + H.DOOR_HALF, kind: 'door' }));
}

function segments(s0, s1, gaps) {
  const out = [];
  let t = s0;
  for (const g of gaps) {
    if (g.t0 > t + 1e-6) out.push({ t0: t, t1: Math.min(g.t0, s1) });
    t = Math.max(t, g.t1);
  }
  if (t < s1 - 1e-6) out.push({ t0: t, t1: s1 });
  return out;
}

/* ---------- furniture ---------- */
function furnish(room, pts, edges, rng, out) {
  const kinds = FURNITURE[room.type] || [];
  const pad = H.WALL_T / 2 + 0.14;
  const box = { x: room.rect.x + pad, y: room.rect.y + pad, w: room.rect.w - 2 * pad, h: room.rect.h - 2 * pad };
  if (box.w <= 0.5 || box.h <= 0.5) return;

  const clear = r => {
    for (const p of pts) if (inRect(r, p.x, p.y, H.FURN_CLEAR)) return false;
    for (const [a, b] of edges) {
      const A = pts[a], B = pts[b];
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        if (inRect(r, A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, H.CABLE_CLEAR)) return false;
      }
    }
    for (const q of out) if (q.room === room.id
      && Math.abs(q.cx - (r.x + r.w / 2)) < (q.bw + r.w) / 2 + 0.06
      && Math.abs(q.cy - (r.y + r.h / 2)) < (q.bh + r.h) / 2 + 0.06) return false;
    return true;
  };

  /* a rug is a floor decal, so it only has to dodge the pads */
  const rug = RUGS[room.type];
  if (rug && box.w > rug[0] && box.h > rug[1]) {
    const r = { x: box.x + (box.w - rug[0]) / 2, y: box.y + (box.h - rug[1]) / 2, w: rug[0], h: rug[1] };
    let ok = true;
    for (const p of pts) if (inRect(r, p.x, p.y, 0.1)) ok = false;
    if (ok) out.push({ room: room.id, kind: 'rug', cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: rug[0], h: rug[1], bw: 0, bh: 0, rot: 0, tone: 0 });
  }

  const sides = [0, 90, 180, 270];
  const spots = [0.12, 0.34, 0.5, 0.68, 0.88];
  const area = room.rect.w * room.rect.h;
  const cap = area > 9 ? 5 : area > 5 ? 4 : 3;
  let placed = 0;
  /* a room can take a second helping of the small stuff, but two beds or two
     cots in one room reads as a mistake */
  const seconds = kinds.filter(k => k[1] * k[2] <= 0.5 && k[0] !== 'plantpot');
  for (const [kind, kw, kh] of kinds.concat(seconds)) {
    if (placed >= cap) break;
    const order = shuffled(sides, rng);
    let done = false;
    for (const rot of order) {
      const bw = rot % 180 === 0 ? kw : kh, bh = rot % 180 === 0 ? kh : kw;
      if (bw > box.w || bh > box.h) continue;
      for (const f of shuffled(spots, rng)) {
        let cx, cy;
        if (rot === 0) { cx = box.x + bw / 2 + f * (box.w - bw); cy = box.y + bh / 2; }
        else if (rot === 180) { cx = box.x + bw / 2 + f * (box.w - bw); cy = box.y + box.h - bh / 2; }
        else if (rot === 90) { cx = box.x + box.w - bw / 2; cy = box.y + bh / 2 + f * (box.h - bh); }
        else { cx = box.x + bw / 2; cy = box.y + bh / 2 + f * (box.h - bh); }
        const r = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
        if (!clear(r)) continue;
        out.push({ room: room.id, kind, cx, cy, w: kw, h: kh, bw, bh, rot, tone: Math.floor(rng() * 3) });
        placed++; done = true; break;
      }
      if (done) break;
    }
  }
}

/* ---------- build ---------- */
export function buildHouse(lv, seed, spacing, thingNames) {
  const rng = rngFromSeed(seed);
  const o = latticeOrigin(lv);
  const pts = lv.nodes.map(n => ({ x: n.c - o.c0, y: n.r - o.r0 }));
  const edges = lv.edges;
  const P = H.OUTER_PAD;
  const foot = { x: -P, y: -P, w: (o.w - 1) + 2 * P, h: (o.h - 1) + 2 * P };

  /* a footprint this small is a studio flat, which is what site 1 is called */
  const studio = foot.w < 3.2 || foot.h < 3.2;
  const part = studio ? { rooms: [{ rect: foot, ids: pts.map((_, i) => i) }], walls: [] } : partition(foot, pts, edges, rng);
  const rooms = part.rooms;
  rooms.forEach((r, i) => { r.id = i; r.cx = r.rect.x + r.rect.w / 2; r.cy = r.rect.y + r.rect.h / 2; });

  /* the front door goes on the bottom wall, in whichever room reaches it
     nearest the middle of the plan */
  const footMid = foot.x + foot.w / 2, bottom = foot.y + foot.h;
  let frontId = 0, bestD = Infinity;
  rooms.forEach(r => {
    if (r.rect.y + r.rect.h < bottom - 1e-6) return;
    const d = Math.abs(r.cx - footMid);
    if (d < bestD) { bestD = d; frontId = r.id; }
  });
  /* a studio is one living space, not a hallway */
  if (studio) { rooms[0].type = 'living'; rooms[0].floor = FLOOR_OF.living; }
  else typeRooms(rooms, frontId, rng);

  const fr = rooms[frontId].rect;
  const fw = H.DOOR_HALF * H.FRONT_MULT;
  const fx = clamp(fr.x + fr.w / 2 + (rng() - 0.5) * fr.w * 0.3, fr.x + H.STUB_MIN + fw, fr.x + fr.w - H.STUB_MIN - fw);
  const front = { t0: fx - fw, t1: fx + fw };

  /* exterior shell, drawn on the footprint's own boundary lines */
  const ext = [
    { dir: 'h', a: foot.y, s0: foot.x, s1: foot.x + foot.w, ext: true, gaps: [] },
    { dir: 'h', a: bottom, s0: foot.x, s1: foot.x + foot.w, ext: true, gaps: [{ ...front, kind: 'front' }] },
    { dir: 'v', a: foot.x, s0: foot.y, s1: bottom, ext: true, gaps: [] },
    { dir: 'v', a: foot.x + foot.w, s0: foot.y, s1: bottom, ext: true, gaps: [] },
  ];
  const half = H.WALL_T / 2;
  for (const w of part.walls) {
    w.s0 -= half; w.s1 += half;   // overlap the walls they run into, so corners close
    openWall(w, pts, edges, rng);
  }
  const walls = part.walls.concat(ext);

  /* ---- everything below is the same plan, scaled into world units ---- */
  const S = spacing;
  const wallRects = [], doors = [];
  walls.forEach((w, i) => {
    const th = (w.ext ? H.EXT_T : H.WALL_T) * S;
    const a = w.a * S;
    segments(w.s0, w.s1, w.gaps).forEach((s, j) => {
      const t0 = s.t0 * S, t1 = s.t1 * S;
      if (t1 - t0 < 1) return;
      wallRects.push(w.dir === 'v'
        ? { key: i + '-' + j, x: a - th / 2, y: t0, w: th, h: t1 - t0, ext: !!w.ext }
        : { key: i + '-' + j, x: t0, y: a - th / 2, w: t1 - t0, h: th, ext: !!w.ext });
    });
    w.gaps.forEach((g, j) => {
      const t0 = g.t0 * S, t1 = g.t1 * S;
      doors.push(w.dir === 'v'
        ? { key: 'd' + i + '-' + j, x: a - th / 2, y: t0, w: th, h: t1 - t0, dir: 'v', kind: g.kind, jamb: th }
        : { key: 'd' + i + '-' + j, x: t0, y: a - th / 2, w: t1 - t0, h: th, dir: 'h', kind: g.kind, jamb: th });
    });
  });

  const props = [];
  rooms.forEach(r => furnish(r, pts, edges, rng, props));

  const roomOfNode = new Int16Array(lv.nodes.length).fill(-1);
  rooms.forEach(r => r.ids.forEach(i => { roomOfNode[i] = r.id; }));

  const plan = {
    foot: { x: foot.x * S, y: foot.y * S, w: foot.w * S, h: foot.h * S },
    outer: { x: (foot.x - H.EXT_T) * S, y: (foot.y - H.EXT_T) * S, w: (foot.w + 2 * H.EXT_T) * S, h: (foot.h + 2 * H.EXT_T) * S },
    rooms: rooms.map(r => ({
      id: r.id, type: r.type, floor: r.floor,
      x: r.rect.x * S, y: r.rect.y * S, w: r.rect.w * S, h: r.rect.h * S,
      cx: r.cx * S, cy: r.cy * S,
    })),
    wallRects, doors,
    props: props.map((p, i) => ({
      key: 'p' + i, room: p.room, kind: p.kind, tone: p.tone, rot: p.rot,
      cx: p.cx * S, cy: p.cy * S, w: p.w * S, h: p.h * S,
    })),
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
    const hash = (u * 7 + v * 3 + i) % Math.max(1, names.length);
    let idx = names.length ? hash : 0;
    const mx = (pts[u].x + pts[v].x) / 2 * S;
    const sag = Math.abs(pts[v].x - pts[u].x) * S * H.SAG_K + H.SAG_C;
    const my = (pts[u].y + pts[v].y) / 2 * S + sag / 2;
    const room = roomAt(plan, mx, my);
    if (room >= 0 && names.length) {
      const list = ROOM_THINGS[plan.rooms[room].type];
      if (list && list.length) {
        const want = list[(u * 7 + v * 3 + i) % list.length];
        const at = names.indexOf(want);
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
