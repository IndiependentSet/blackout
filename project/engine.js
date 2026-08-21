// BLACKOUT engine: seeded gadget-composition level generator + exact solver.
// Graph = { nodes:[{c,r}], edges:[[a,b]], adj:[[..]] }  (lattice coords, planar, max degree 3)

export function rngFromSeed(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const ri = (rng, n) => Math.floor(rng() * n) % n;

/* ---------- geometry ---------- */
function distPtSeg(p, a, b) {
  const vx = b.c - a.c, vy = b.r - a.r;
  const wx = p.c - a.c, wy = p.r - a.r;
  const L = vx * vx + vy * vy;
  let t = L ? (wx * vx + wy * vy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(a.c + t * vx - p.c, a.r + t * vy - p.r);
}
function ccw(a, b, c) { return (b.c - a.c) * (c.r - a.r) - (b.r - a.r) * (c.c - a.c); }
function segCross(a, b, c, d) {
  const d1 = ccw(a, b, c), d2 = ccw(a, b, d), d3 = ccw(c, d, a), d4 = ccw(c, d, b);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

/* ---------- builder ---------- */
function newG() { return { nodes: [], edges: [], adj: [], key: new Map() }; }
const ck = (c, r) => c + ',' + r;

function addNode(g, c, r) {
  if (g.key.has(ck(c, r))) return -1;
  const i = g.nodes.length;
  g.nodes.push({ c, r }); g.adj.push([]); g.key.set(ck(c, r), i);
  return i;
}
function edgeOk(g, a, b) {
  if (a === b || g.adj[a].includes(b)) return false;
  if (g.adj[a].length >= 3 || g.adj[b].length >= 3) return false;
  const A = g.nodes[a], B = g.nodes[b];
  if (Math.hypot(B.c - A.c, B.r - A.r) > 1.5) return false;
  for (let i = 0; i < g.nodes.length; i++)
    if (i !== a && i !== b && distPtSeg(g.nodes[i], A, B) < 0.4) return false;
  for (const [u, v] of g.edges) {
    if (u === a || u === b || v === a || v === b) continue;
    if (segCross(A, B, g.nodes[u], g.nodes[v])) return false;
  }
  return true;
}
function addEdge(g, a, b) {
  if (!edgeOk(g, a, b)) return false;
  g.edges.push([a, b]); g.adj[a].push(b); g.adj[b].push(a);
  return true;
}
function snapshot(g) { return { n: g.nodes.length, e: g.edges.length, adj: g.adj.map(l => l.length) }; }
function restore(g, s) {
  for (let i = s.n; i < g.nodes.length; i++) g.key.delete(ck(g.nodes[i].c, g.nodes[i].r));
  g.nodes.length = s.n; g.adj.length = s.n; g.edges.length = s.e;
  for (let i = 0; i < s.n; i++) g.adj[i].length = s.adj[i];
}

/* ---------- gadgets ----------
   cells: relative lattice cells; links: internal edges; conn: index of cell wired to the anchor */
const GADGETS = {
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
};
const OFFS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function xform(cell, rot, flip) {
  let [c, r] = cell;
  if (flip) c = -c;
  for (let i = 0; i < rot; i++) { const t = c; c = -r; r = t; }
  return [c, r];
}

function placeGadget(g, rng, gname) {
  const G = GADGETS[gname];
  const anchors = g.nodes.map((_, i) => i).filter(i => g.adj[i].length < 3);
  if (!anchors.length) return false;
  for (let att = 0; att < 24; att++) {
    const A = pick(rng, anchors);
    const rot = ri(rng, 4), flip = rng() < 0.5;
    const off = pick(rng, OFFS);
    const cells = G.cells.map(c => xform(c, rot, flip));
    const target = [g.nodes[A].c + off[0], g.nodes[A].r + off[1]];
    const dx = target[0] - cells[G.conn][0], dy = target[1] - cells[G.conn][1];
    const snap = snapshot(g);
    const ids = [];
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

/* ---------- exact solver: minimum cover + how many optimal solutions ---------- */
export function solve(g) {
  const n = g.nodes.length, adj = g.adj;
  const state = new Int8Array(n);
  const order = g.nodes.map((_, i) => i).sort((a, b) => adj[b].length - adj[a].length);
  let best = n + 1, count = 0, sol = null, alt = null, visits = 0;

  const lb = () => {
    const used = new Uint8Array(n); let m = 0;
    for (const [u, v] of g.edges)
      if (state[u] === 0 && state[v] === 0 && !used[u] && !used[v]) { used[u] = used[v] = 1; m++; }
    return m;
  };
  const collect = () => { const s = []; for (let i = 0; i < n; i++) if (state[i] === 1) s.push(i); return s; };

  function rec(taken) {
    if (++visits > 600000) throw new Error('search blew up');
    if (taken > best) return;
    let v = -1;
    for (const x of order) if (state[x] === 0) { v = x; break; }
    if (v < 0) {
      if (taken < best) { best = taken; count = 1; sol = collect(); alt = null; }
      else if (taken === best) { count++; if (!alt) alt = collect(); }
      return;
    }
    if (taken + lb() > best) return;
    state[v] = 1; rec(taken + 1); state[v] = 0;
    state[v] = 2;
    const forced = []; let ok = true;
    for (const u of adj[v]) {
      if (state[u] === 2) { ok = false; break; }
      if (state[u] === 0) { state[u] = 1; forced.push(u); }
    }
    if (ok) rec(taken + forced.length);
    for (const u of forced) state[u] = 0;
    state[v] = 0;
  }
  rec(0);
  return { k: best, count, sol, alt, visits };
}

/* ---------- difficulty: which technique clears the board ---------- */
function asSets(g) {
  const m = new Map();
  g.nodes.forEach((_, i) => m.set(i, new Set(g.adj[i])));
  return m;
}
function reduce(m, allowFold) {
  let moved = true;
  while (moved) {
    moved = false;
    for (const [v, ns] of m) {
      if (ns.size === 0) { m.delete(v); moved = true; break; }
      if (ns.size === 1) {                       // leaf rule: take the neighbour
        const u = [...ns][0];
        for (const w of m.get(u)) m.get(w) && m.get(w).delete(u);
        m.delete(u); m.delete(v); moved = true; break;
      }
      if (allowFold && ns.size === 2) {
        const [u, w] = [...ns];
        if (m.get(u).has(w)) {                   // triangle: take both neighbours
          for (const x of [u, w]) { for (const y of m.get(x)) m.get(y) && m.get(y).delete(x); m.delete(x); }
          m.delete(v); moved = true; break;
        }
        const merged = new Set();                // degree-2 fold
        for (const x of [u, w]) for (const y of m.get(x)) if (y !== v && y !== u && y !== w) merged.add(y);
        for (const x of [v, u, w]) { for (const y of m.get(x) || []) m.get(y) && m.get(y).delete(x); m.delete(x); }
        const id = 'f' + v;
        m.set(id, merged);
        for (const y of merged) m.get(y).add(id);
        moved = true; break;
      }
    }
  }
  return m.size === 0;
}
export function difficulty(g) {
  if (reduce(asSets(g), false)) return 1;
  if (reduce(asSets(g), true)) return 2;
  return 3;
}

/* ---------- generation ---------- */
const MENU = {
  1: ['spur', 'spur', 'hub', 'hub', 'path3'],
  2: ['path3', 'path4', 'path5', 'spur', 'hub', 'ring4'],
  3: ['crown', 'crown', 'ring6', 'ring4', 'path4', 'path5', 'hub', 'spur'],
};

function grow(rng, target, diff) {
  const g = newG();
  addNode(g, 0, 0);
  let fails = 0;
  while (g.nodes.length < target - 1 && fails < 40) {
    const menu = MENU[diff];
    const cand = menu.filter(k => g.nodes.length + GADGETS[k].cells.length <= target + 1);
    if (!cand.length) break;
    if (!placeGadget(g, rng, pick(rng, cand))) fails++;
  }
  return g;
}

// close nearby degree-2 junctions into rings/crowns: kills the leaf and fold rules,
// which is what forces a crown reduction or a real branch.
function densify(g, rng, rounds) {
  for (let t = 0; t < rounds; t++) {
    const open = g.nodes.map((_, i) => i).filter(i => g.adj[i].length < 3);
    if (open.length < 2) return;
    const a = pick(rng, open);
    const near = open.filter(b => b !== a && !g.adj[a].includes(b) &&
      Math.hypot(g.nodes[b].c - g.nodes[a].c, g.nodes[b].r - g.nodes[a].r) <= 1.5);
    if (near.length) addEdge(g, a, pick(rng, near));
  }
}

function spurAt(g, v) {
  if (g.adj[v].length >= 3) return false;
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
function repair(g, rng, r) {
  const A = new Set(r.sol), B = new Set(r.alt || []);
  const diffs = [...A].filter(v => !B.has(v)).concat([...B].filter(v => !A.has(v)));
  for (let t = diffs.length; t > 0; t--) {
    const v = diffs.splice(ri(rng, diffs.length), 1)[0];
    if (spurAt(g, v)) return true;
  }
  return densifyOnce(g, rng);
}
function densifyOnce(g, rng) {
  const open = g.nodes.map((_, i) => i).filter(i => g.adj[i].length < 3);
  for (let t = 0; t < 8 && open.length > 1; t++) {
    const a = pick(rng, open);
    const near = open.filter(b => b !== a && !g.adj[a].includes(b) &&
      Math.hypot(g.nodes[b].c - g.nodes[a].c, g.nodes[b].r - g.nodes[a].r) <= 1.5);
    if (near.length && addEdge(g, a, pick(rng, near))) return true;
  }
  return false;
}

export function makeLevel(rng, target, diff, budgetMs, accept) {
  const t0 = Date.now(), budget = budgetMs || 500;
  let fallback = null;
  for (let att = 0; att < 400; att++) {
    if (Date.now() - t0 > budget && fallback) break;
    const seedSize = Math.max(4, diff === 3 ? target - 3 : target - 1);
    const g = grow(rng, seedSize, diff);
    if (g.edges.length < 2 || g.nodes.some((_, i) => g.adj[i].length === 0)) continue;
    if (diff === 3) densify(g, rng, Math.ceil(target * 0.8));
    for (let fix = 0; fix < 18; fix++) {
      let r;
      try { r = solve(g); } catch (e) { break; }
      if (r.count === 1) {
        const d = difficulty(g), n = g.nodes.length;
        const lv = { nodes: g.nodes.map(p => ({ c: p.c, r: p.r })), edges: g.edges.map(e => e.slice()),
                     adj: g.adj.map(a => a.slice()), k: r.k, sol: r.sol, stars: d };
        const okShape = !accept || accept(lv);
        if (okShape && d === diff && n >= (target <= 8 ? target : target - 1) && n <= target + 2) return lv;
        if (!okShape) break;
        const score = Math.abs(d - diff) * 100 + Math.abs(n - target);
        if (!fallback || score < fallback._score) { lv._score = score; fallback = lv; }
        break;
      }
      if (g.nodes.length > target + 2) break;

      if (!repair(g, rng, r)) break;
    }
  }
  return fallback;
}

export const RAMP = [
  { n: 4, d: 1 }, { n: 7, d: 1 }, { n: 10, d: 2 },
  { n: 14, d: 2 }, { n: 18, d: 3 }, { n: 24, d: 3 }, { n: 30, d: 3 },
];

export function makeLevelForDay(seed, idx) {
  const step = RAMP[idx];
  const accept = idx === 0
    ? lv => lv.nodes.length >= 4 && lv.adj.some(a => a.length === 3) && lv.k <= 2
    : null;
  for (let salt = 0; salt < 6; salt++) {
    const lv = makeLevel(rngFromSeed(seed * 7919 + idx * 104729 + salt * 31), step.n, step.d, idx >= 4 ? 700 : 400, accept);
    if (lv) return lv;
  }
  return makeLevel(rngFromSeed(seed + idx), step.n, 1, 900);
}
export function makeDay(seed) {
  return RAMP.map((_, i) => makeLevelForDay(seed, i));
}

/* ---------- hints ---------- */
export function hintLeaf(lv, placed) {
  for (let i = 0; i < lv.nodes.length; i++) {
    if (lv.adj[i].length !== 1) continue;
    const nb = lv.adj[i][0];
    if (!placed.has(nb)) return { leaf: i, forced: nb };
  }
  return null;
}
export function hintMatching(lv) {
  const used = new Set(); const m = [];
  for (let i = 0; i < lv.edges.length; i++) {
    const [u, v] = lv.edges[i];
    if (!used.has(u) && !used.has(v)) { used.add(u); used.add(v); m.push(i); }
  }
  return m;
}
export function hintReveal(lv, placed) {
  return lv.sol.find(v => !placed.has(v)) ?? null;
}
