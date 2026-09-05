import { Component } from 'react';
import * as E from './engine.js';
import { BREEDS, CAT_BASELINE } from './assets/cats/index.js';
import { THINGS, THING_BASELINE } from './assets/things/index.js';
import { buildHouse, houseSeed } from './house.js';

const SOUND_ON = true;
const CABLE_SAG = 0.1;
const DAY_EPOCH = Date.UTC(2026, 3, 15);

/* CATASTROPHE INC.: the "houses" are demolition sites on the weekly job sheet */
const SITES = ['THE STUDIO FLAT', 'GRANDMA’S PARLOUR', 'THE OPEN-PLAN LOFT', 'SUBURBAN SEMI', 'THE MANOR ANNEXE', 'CORNER PENTHOUSE', 'THE OLD RECTORY'];
const BRIEF = [
  { n: 1, head: 'READ THE FLOOR PLAN.', body: 'Dashed paths run between pads. Each one carries a fixture the client wants gone.' },
  { n: 2, head: 'DEPLOY ONTO A PAD.', body: 'A cat covers every path touching its pad — vases, lamps, fishbowls, all of it.' },
  { n: 3, head: 'KEEP THE HEADCOUNT DOWN.', body: 'Hit the budget exactly and the site closes purr-fect. One cat over and accounts notice.' },
];
/* the work-order diagram uses the same sticker art as the game board, not a
   hand-drawn stand-in, so the "how it works" illustration matches play */
const INTRO_CAT = BREEDS.find(b => b.name === 'TROUBLE') || BREEDS[0];
const INTRO_THING = THINGS.find(t => t.name === 'mug') || THINGS[0];

/* how big a sticker cat is drawn, and where its feet land, in node units */
const CAT_D = 56;
const CAT_FOOT = 18;
const CAT_TOP = CAT_FOOT - CAT_D * CAT_BASELINE;

/* same, for the smashable sitting on the middle of a cable */
const THING_D = 52;
const THING_FOOT = 11;
const THING_TOP = THING_FOOT - THING_D * THING_BASELINE;

/* ---- world + camera ----
   Every house is laid out at the same lattice spacing, so a cat is exactly the
   same size in house 7 as in house 1 and a big graph costs navigation instead
   of legibility. The board is a camera over that world, driven by the SVG's
   viewBox (an inner transform would break getScreenCTM hit-testing). */
const SPACING = 130;        // world units between neighbouring junctions
const WORLD_MARGIN = 140;   // ground you can pan into, around the building
const CONTENT_PAD = 46;     // what "the whole house" means when fitting it
const CAM_H = 520;          // camera frame height in world units; the width
const CAM_A = 640 / 520;    // follows the board's real aspect, so it never letterboxes
const Z_PLAY = 1;           // the zoom every house settles at
const Z_KEEP = 0.88;        // ...unless the whole site is within a whisker of
                            // fitting, in which case show all of it
const Z_MAX = 1.8;
const CAT_S = 1;            // sprite scales are constants now that spacing is
const THING_S = 1.15;       // fixed — nothing left to compensate for
const MAP_W = 152, MAP_H = 118;   // minimap, shown only when a house overflows

/* ---- the building ----
   house.js turns the level's lattice into rooms, walls and furniture; all of
   it is drawn under the paths, never animates, and is dimmed as one group so
   the puzzle stays the loudest thing on the board. */
const HOUSE_DIM = 0.92;
const THING_NAMES = THINGS.map(t => t.name);
const FLOOR_FILL = {
  wood: 'url(#cc-planks)', tile: 'url(#cc-tile)',
  checker: 'url(#cc-checker)', carpet: 'url(#cc-carpet)', concrete: 'url(#cc-concrete)',
};
const WALL_INK = '#D9C39B', WALL_EXT = '#C0A377', WALL_SHADOW = '#160B06';
const PROP_INK = '#3A2416';
const PROP_TONES = {
  bed: ['#B79AC6', '#C6A08F', '#9FB6C9'], sofa: ['#B4635E', '#7F9068', '#8A6FA8'],
  table: ['#9A6B45', '#8A5E3C', '#A9794F'], counter: ['#C7B49A', '#B9A488', '#D2C0A6'],
  tub: ['#DEE9EE'], toilet: ['#E8EFF2'], sink: ['#E2ECF0'],
  shelf: ['#8A5E3C', '#7C5334', '#946949'], cot: ['#C9A46E'], desk: ['#8F6242'],
  plantpot: ['#B4643C'], crate: ['#A2784B', '#966E44', '#AE8455'],
  rug: ['#B96F6C', '#6E8C74', '#7C6EA0'],
};

/* Furniture: flat top-down silhouettes drawn straight from the plan's numbers,
   no image assets. A piece is drawn with its back on the -h/2 edge and `rot`
   turns it to face whichever wall house.js stood it against. Everything here
   is deliberately muted — it sits under the paths and must never read as one. */
function propArt(p) {
  const w = p.w, h = p.h, x = -w / 2, y = -h / 2;
  const tones = PROP_TONES[p.kind] || PROP_TONES.table;
  const fill = tones[p.tone % tones.length];
  let art = <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} />;

  if (p.kind === 'rug') {
    return (
      <g key={p.key} transform={'translate(' + p.cx + ' ' + p.cy + ') rotate(' + p.rot + ')'}>
        <rect x={x} y={y} width={w} height={h} rx={h * 0.16} fill={fill} opacity={.62} />
        <rect x={x + w * 0.1} y={y + h * 0.14} width={w * 0.8} height={h * 0.72} rx={h * 0.1}
          fill="none" stroke="#FFEBC8" strokeWidth={3} opacity={.35} />
      </g>
    );
  }
  if (p.kind === 'bed') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} />
      <rect x={x + w * 0.1} y={y + h * 0.06} width={w * 0.8} height={h * 0.2} rx={5} fill="#FFF3DC" />
      <rect x={x} y={y + h * 0.42} width={w} height={h * 0.58} rx={8} fill={fill} opacity={.55} />
      <rect x={x} y={y + h * 0.42} width={w} height={h * 0.58} rx={8} fill="none" />
    </>;
  } else if (p.kind === 'sofa') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={9} fill={fill} />
      <rect x={x + w * 0.16} y={y + h * 0.34} width={w * 0.68} height={h * 0.6} rx={6} fill="#FFF3DC" opacity={.24} />
    </>;
  } else if (p.kind === 'table' || p.kind === 'desk') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} />
      <rect x={x + w * 0.12} y={y + h * 0.18} width={w * 0.76} height={h * 0.64} rx={4} fill="#FFF3DC" opacity={.16} />
      {p.kind === 'desk' && <rect x={-w * 0.16} y={y + h * 0.16} width={w * 0.32} height={h * 0.4} rx={3} fill="#2F2338" />}
    </>;
  } else if (p.kind === 'counter') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={fill} />
      <rect x={x} y={y} width={w} height={h * 0.3} rx={5} fill="#7C6A55" opacity={.5} />
      <circle cx={x + w * 0.72} cy={0} r={Math.min(w, h) * 0.24} fill="#4C4038" />
    </>;
  } else if (p.kind === 'tub') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={h * 0.34} fill={fill} />
      <rect x={x + w * 0.1} y={y + h * 0.2} width={w * 0.72} height={h * 0.6} rx={h * 0.26} fill="#A9CBDD" />
      <rect x={x + w * 0.88} y={-h * 0.08} width={w * 0.07} height={h * 0.16} rx={2} fill="#8A9AA4" />
    </>;
  } else if (p.kind === 'toilet') {
    art = <>
      <rect x={x} y={y} width={w} height={h * 0.34} rx={4} fill={fill} />
      <ellipse cx={0} cy={y + h * 0.66} rx={w * 0.42} ry={h * 0.3} fill={fill} />
    </>;
  } else if (p.kind === 'sink') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} />
      <ellipse cx={0} cy={h * 0.08} rx={w * 0.32} ry={h * 0.26} fill="#A9CBDD" />
    </>;
  } else if (p.kind === 'shelf') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={fill} />
      {[0.12, 0.3, 0.46, 0.66, 0.82].map((f, i) => (
        <rect key={i} x={x + w * f} y={y + h * 0.16} width={w * 0.1} height={h * 0.62} rx={2}
          fill={['#C0503F', '#3F6C7A', '#C99A3C', '#6A4E86', '#4E7A4A'][i]} stroke="none" />
      ))}
    </>;
  } else if (p.kind === 'cot') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={fill} />
      <rect x={x + w * 0.12} y={y + h * 0.12} width={w * 0.76} height={h * 0.76} rx={5} fill="#F2E3C6" />
      {[0.3, 0.5, 0.7].map((f, i) => (
        <rect key={i} x={x + w * f} y={y + h * 0.12} width={w * 0.05} height={h * 0.76} fill={fill} stroke="none" />
      ))}
    </>;
  } else if (p.kind === 'crate') {
    art = <>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} />
      <path d={'M ' + x + ' ' + y + ' L ' + (x + w) + ' ' + (y + h) + ' M ' + (x + w) + ' ' + y + ' L ' + x + ' ' + (y + h)}
        stroke={PROP_INK} strokeWidth={2.4} opacity={.5} fill="none" />
    </>;
  } else if (p.kind === 'plantpot') {
    art = <>
      <circle cx={0} cy={-h * 0.06} r={w * 0.34} fill="#4E7A4A" />
      <circle cx={-w * 0.24} cy={h * 0.06} r={w * 0.26} fill="#5C8C52" />
      <circle cx={w * 0.24} cy={h * 0.08} r={w * 0.24} fill="#436B41" />
      <path d={'M ' + (-w * 0.26) + ' ' + (h * 0.16) + ' L ' + (w * 0.26) + ' ' + (h * 0.16) +
        ' L ' + (w * 0.18) + ' ' + (h * 0.5) + ' L ' + (-w * 0.18) + ' ' + (h * 0.5) + ' Z'} fill={fill} />
    </>;
  }
  return (
    <g key={p.key} transform={'translate(' + p.cx + ' ' + p.cy + ') rotate(' + p.rot + ')'}
      stroke={PROP_INK} strokeWidth={3} strokeLinejoin="round">{art}</g>
  );
}

export default class CatCoverGame extends Component {
  state = {
    screen: 'intro',
    levels: [null, null, null, null, null, null, null],
    idx: 0,
    placed: [],
    results: [null, null, null, null, null, null, null],
    hint: null,
    focus: 0,
    kbd: false,
    msg: '',
    copied: false,
    cam: { x: 0, y: 0, z: Z_PLAY },
    aspect: CAM_A,
    boardW: 640,
    expanded: false,
    grabbing: false,
  };

  _ptrs = new Map();
  _lays = new WeakMap();

  componentDidMount() {
    this.onKey = this.onKey.bind(this);
    window.addEventListener('keydown', this.onKey);
    const levels = this.state.levels.slice();
    levels[0] = E.makeLevelForDay(this.seed(), 0);
    this.setState({ levels }, () => this.frame(0));
    this.queue(1);
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKey);
    if (this._ro) this._ro.disconnect();
    cancelAnimationFrame(this._raf);
    clearTimeout(this._shot);
    if (this._svg) this._svg.removeEventListener('wheel', this.onWheel);
  }

  seed() { return this.day() + 11; }
  day() {
    const d = Math.floor((Date.now() - DAY_EPOCH) / 86400000);
    return Math.max(1, d);
  }
  queue(i) {
    if (i > 6) return;
    setTimeout(() => {
      const levels = this.state.levels.slice();
      levels[i] = E.makeLevelForDay(this.seed(), i);
      this.setState({ levels });
      this.queue(i + 1);
    }, 40);
  }
  lv() { return this.state.levels[this.state.idx]; }
  litSet(lv, placed) {
    const p = new Set(placed), s = new Set();
    lv.edges.forEach(([u, v], i) => { if (p.has(u) || p.has(v)) s.add(i); });
    return s;
  }
  solved() {
    const lv = this.lv();
    return !!lv && this.litSet(lv, this.state.placed).size === lv.edges.length;
  }

  /* ---- audio: chirp on wake, crash on smash ---- */
  ac() {
    if (!SOUND_ON) return null;
    if (!this._ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      this._ac = new C();
    }
    if (this._ac.state === 'suspended') this._ac.resume();
    return this._ac;
  }
  chirp(n, up) {
    const ac = this.ac(); if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'triangle';
    const base = 330 * Math.pow(1.0595, Math.max(0, (n - 1) * 2));
    o.frequency.setValueAtTime(up ? base * 0.7 : base, t);
    o.frequency.exponentialRampToValueAtTime(up ? base * 1.6 : base * 0.55, t + 0.12);
    f.type = 'lowpass'; f.frequency.value = 4200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(f); f.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.36);
  }
  crash(count) {
    const ac = this.ac(); if (!ac || !count) return;
    const t = ac.currentTime, dur = 0.28;
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.4);
    const src = ac.createBufferSource(), g = ac.createGain(), bp = ac.createBiquadFilter();
    src.buffer = buf; bp.type = 'highpass'; bp.frequency.value = 1400;
    g.gain.value = Math.min(0.13, 0.05 + count * 0.02);
    src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(t);
  }
  fanfare() {
    const ac = this.ac(); if (!ac) return;
    const t0 = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => {
      const t = t0 + i * 0.09;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(hz, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.085, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.46);
    });
  }

  bloom(i) {
    requestAnimationFrame(() => {
      const el = document.getElementById('cc-bloom-' + i);
      if (el && el.animate) el.animate(
        [{ r: 8, opacity: 0.9, strokeWidth: 5 }, { r: 44, opacity: 0, strokeWidth: 0.6 }],
        { duration: 620, easing: 'cubic-bezier(.1,.8,.2,1)' });
    });
  }
  flash() {
    const el = document.getElementById('cc-flash');
    if (el && el.animate) el.animate([{ opacity: 0.55 }, { opacity: 0.55, offset: 0.16 }, { opacity: 0 }],
      { duration: 520, easing: 'ease-out' });
  }

  /* ---- moves ---- */
  tap(i) {
    const lv = this.lv(); if (!lv) return;
    const placed = this.state.placed.slice();
    const at = placed.indexOf(i);
    const before = this.litSet(lv, placed).size;
    if (at >= 0) {
      placed.splice(at, 1);
      this.setState({ placed, msg: '', focus: i, hint: this.state.hint && this.state.hint.kind === 'reveal' ? null : this.state.hint });
      this.chirp(placed.length + 1, false);
      return;
    }
    if (this.solved()) return;
    if (placed.length >= lv.k + 1) {
      this.setState({ msg: 'PAYROLL SAYS NO — RECALL SOMEONE', focus: i });
      this.chirp(1, false);
      return;
    }
    placed.push(i);
    const after = this.litSet(lv, placed).size;
    const done = after === lv.edges.length;
    const results = this.state.results.slice();
    if (done) results[this.state.idx] = placed.length <= lv.k ? 'perfect' : 'over';
    this.setState({ placed, results, focus: i, hint: null, msg: '', copied: false });
    this.chirp(placed.length, true);
    this.crash(after - before);
    this.bloom(i);
    if (done) { this.flash(); this.fanfare(); }
  }
  reset() { this.setState({ placed: [], hint: null, msg: '', focus: 0 }); }
  go(i) {
    if (i < 0 || i > 6 || !this.state.levels[i]) return;
    this.setState({ idx: i, placed: [], hint: null, msg: '', focus: 0, copied: false });
    this.frame(i);
  }
  next() { if (this.solved() && this.state.idx < 6) this.go(this.state.idx + 1); }
  hint(tier) {
    const lv = this.lv(); if (!lv) return;
    const p = new Set(this.state.placed);
    if (tier === 1) {
      const h = E.hintLeaf(lv, p);
      this.setState({
        hint: h ? { kind: 'leaf', leaf: h.leaf, forced: h.forced } : null,
        msg: h ? 'ONE FIXTURE ONLY — ITS NEIGHBOUR IS HIRED' : 'NO DEAD-END PADS LEFT',
      });
    } else if (tier === 2) {
      const m = E.hintMatching(lv);
      this.setState({ hint: { kind: 'proof', edges: m }, msg: 'ESTIMATE: ' + m.length + ' CATS MINIMUM' });
    } else {
      const v = E.hintReveal(lv, p);
      this.setState({
        hint: v == null ? null : { kind: 'reveal', node: v },
        msg: v == null ? 'THE WHOLE CREW IS ALREADY ON SITE' : 'THIS PAD IS IN THE ANSWER',
      });
    }
  }

  onKey(e) {
    const k = e.key;
    if (this.state.screen === 'intro') {
      if (k === 'Enter' || k === ' ') { e.preventDefault(); this.setState({ screen: 'game' }); }
      return;
    }
    const lv = this.lv(); if (!lv) return;
    if (!this.state.kbd) this.setState({ kbd: true });
    if (k === 'r' || k === 'R') { e.preventDefault(); return this.reset(); }
    if (k === 'n' || k === 'N') { e.preventDefault(); return this.next(); }
    if (k === 'f' || k === 'F') { e.preventDefault(); return this.fit(); }
    if (k === 'e' || k === 'E') { e.preventDefault(); return this.setState(s => ({ expanded: !s.expanded })); }
    if (k === '+' || k === '=') { e.preventDefault(); return this.zoomBy(1.25); }
    if (k === '-' || k === '_') { e.preventDefault(); return this.zoomBy(0.8); }
    if (k === '1' || k === '2' || k === '3') { e.preventDefault(); return this.hint(+k); }
    if (k === 'Enter' || k === ' ') { e.preventDefault(); return this.tap(this.state.focus); }
    const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!dirs[k]) return;
    e.preventDefault();
    const [dx, dy] = dirs[k], cur = lv.nodes[this.state.focus] || lv.nodes[0];
    let best = -1, bestScore = Infinity;
    lv.nodes.forEach((n, i) => {
      if (i === this.state.focus) return;
      const vx = n.c - cur.c, vy = n.r - cur.r;
      const along = vx * dx + vy * dy, off = Math.abs(vx * dy - vy * dx);
      if (along <= 0) return;
      const s = along + off * 2.5;
      if (s < bestScore) { bestScore = s; best = i; }
    });
    if (best >= 0) this.setState({ focus: best }, () => this.follow(best));
  }

  /* lattice -> world, at one fixed scale for every house, plus the building
     that lattice implies. Memoized per level object: queueing site N+1 frames
     it while site N is still rendering, so one cache slot would thrash. */
  layout(lv) {
    const hit = this._lays.get(lv);
    if (hit) return hit;
    const cs = lv.nodes.map(n => n.c), rs = lv.nodes.map(n => n.r);
    const c0 = Math.min(...cs), r0 = Math.min(...rs);
    const w = (Math.max(...cs) - c0) * SPACING, h = (Math.max(...rs) - r0) * SPACING;
    /* seeded off the level's own coordinates — layout() runs during render, so
       it must not reach for the day or the site index */
    const plan = buildHouse(lv, houseSeed(lv), SPACING, THING_NAMES);
    const O = plan.outer;
    /* content is what Fit frames and what decides whether a site overflows:
       the whole building, so its outer walls never get cropped. world is the
       ground you can pan into, around it. */
    const c = {
      x: Math.min(-CONTENT_PAD, O.x), y: Math.min(-CONTENT_PAD, O.y),
      x1: Math.max(w + CONTENT_PAD, O.x + O.w), y1: Math.max(h + CONTENT_PAD, O.y + O.h),
    };
    const L = {
      lv, sp: SPACING, cx: w / 2, cy: h / 2, plan,
      pos: lv.nodes.map(n => ({ x: (n.c - c0) * SPACING, y: (n.r - r0) * SPACING })),
      content: { x: c.x, y: c.y, w: c.x1 - c.x, h: c.y1 - c.y },
      world: { x: O.x - WORLD_MARGIN, y: O.y - WORLD_MARGIN, w: O.w + 2 * WORLD_MARGIN, h: O.h + 2 * WORLD_MARGIN },
    };
    this._lays.set(lv, L);
    return L;
  }

  /* ---- camera ---- */
  camW() { return CAM_H * this.state.aspect; }
  zBounds(L) {
    const fit = Math.min(this.camW() / L.content.w, CAM_H / L.content.h);
    return { fit, min: Math.min(fit, Z_PLAY), max: Z_MAX };
  }
  clampCam(c, L) {
    const zb = this.zBounds(L), W = L.world;
    const z = Math.max(zb.min, Math.min(zb.max, c.z));
    const hw = this.camW() / (2 * z), hh = CAM_H / (2 * z);
    return {
      z,
      x: W.w <= 2 * hw ? W.x + W.w / 2 : Math.max(W.x + hw, Math.min(W.x + W.w - hw, c.x)),
      y: W.h <= 2 * hh ? W.y + W.h / 2 : Math.max(W.y + hh, Math.min(W.y + W.h - hh, c.y)),
    };
  }
  reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  setCam(to, L) { this.setState({ cam: this.clampCam(to, L) }); }
  tween(to, ms, L) {
    cancelAnimationFrame(this._raf);
    const target = this.clampCam(to, L);
    if (ms <= 0 || this.reduced()) return this.setState({ cam: target });
    const from = { ...this.state.cam }, t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      this.setState({ cam: {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        z: from.z + (target.z - from.z) * e,
      } });
      if (p < 1) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }
  /* entering a house: an establishing shot of the whole place, then in to play zoom */
  frame(i) {
    const lv = this.state.levels[i]; if (!lv) return;
    const L = this.layout(lv), zb = this.zBounds(L);
    const play = { x: L.cx, y: L.cy, z: Z_PLAY };
    const whole = { x: L.content.x + L.content.w / 2, y: L.content.y + L.content.h / 2, z: zb.fit };
    cancelAnimationFrame(this._raf);
    clearTimeout(this._shot);
    if (zb.fit >= Z_PLAY) return this.setCam(play, L);
    /* a site that all but fits is worth seeing whole — anything smaller still
       plays at Z_PLAY, so a cat stays the same size from site 1 to site 7 */
    if (zb.fit >= Z_KEEP) return this.setCam(whole, L);
    if (this.reduced()) return this.setCam(play, L);
    this.setCam(whole, L);
    this._shot = setTimeout(() => this.tween(play, 700, L), 420);
  }
  fit() {
    const lv = this.lv(); if (!lv) return;
    const L = this.layout(lv), C = L.content;
    clearTimeout(this._shot);
    this.tween({ x: C.x + C.w / 2, y: C.y + C.h / 2, z: this.zBounds(L).fit }, 320, L);
  }
  zoomBy(k) {
    const lv = this.lv(); if (!lv) return;
    const L = this.layout(lv), c = this.state.cam;
    clearTimeout(this._shot);
    this.tween({ x: c.x, y: c.y, z: c.z * k }, 180, L);
  }
  /* nudge the camera just enough to bring a node back into the safe box */
  follow(i) {
    const lv = this.lv(); if (!lv) return;
    const L = this.layout(lv), p = L.pos[i], c = this.state.cam;
    const sx = (this.camW() / (2 * c.z)) * 0.7, sy = (CAM_H / (2 * c.z)) * 0.7;
    const dx = p.x - c.x, dy = p.y - c.y;
    let nx = c.x, ny = c.y;
    if (dx > sx) nx = p.x - sx; else if (dx < -sx) nx = p.x + sx;
    if (dy > sy) ny = p.y - sy; else if (dy < -sy) ny = p.y + sy;
    if (nx !== c.x || ny !== c.y) this.tween({ x: nx, y: ny, z: c.z }, 240, L);
  }

  /* ---- pointer: drag to pan, wheel/pinch to zoom, short press to tap ---- */
  svgRef = el => {
    if (this._svg === el) return;
    if (this._svg) this._svg.removeEventListener('wheel', this.onWheel);
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    this._svg = el;
    if (!el) return;
    el.addEventListener('wheel', this.onWheel, { passive: false });
    if (!window.ResizeObserver) return;
    this._ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const aspect = r.width / r.height;
      if (Math.abs(aspect - this.state.aspect) < 0.005 && Math.abs(r.width - this.state.boardW) < 2) return;
      this.setState({ aspect, boardW: r.width }, () => {
        const lv = this.lv();
        if (lv) this.setCam(this.state.cam, this.layout(lv));
      });
    });
    this._ro.observe(el);
  };
  toWorld(cx, cy) {
    const svg = this._svg; if (!svg) return null;
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(m.inverse());
  }
  /* world units per client pixel — max(), because the viewBox is letterboxed
     on whichever axis doesn't bind */
  unitsPerPx(z) {
    const r = this._svg.getBoundingClientRect();
    return Math.max((this.camW() / z) / r.width, (CAM_H / z) / r.height);
  }
  /* camera that puts a world point under a client point at a given zoom */
  camFor(wp, cx, cy, z) {
    const r = this._svg.getBoundingClientRect(), u = this.unitsPerPx(z);
    return { x: wp.x - (cx - (r.left + r.width / 2)) * u, y: wp.y - (cy - (r.top + r.height / 2)) * u, z };
  }
  onWheel = e => {
    const lv = this.lv(); if (!lv) return;
    e.preventDefault();
    const L = this.layout(lv), zb = this.zBounds(L), c = this.state.cam;
    const wp = this.toWorld(e.clientX, e.clientY); if (!wp) return;
    const z = Math.max(zb.min, Math.min(zb.max, c.z * Math.exp(-e.deltaY * 0.0015)));
    if (z === c.z) return;
    cancelAnimationFrame(this._raf); clearTimeout(this._shot);
    this.setCam(this.camFor(wp, e.clientX, e.clientY, z), L);
  };
  pinchSpan() {
    const [a, b] = [...this._ptrs.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
  onDown = e => {
    if (!this.lv()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    this._ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelAnimationFrame(this._raf); clearTimeout(this._shot);
    if (this._ptrs.size === 1) {
      this._drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0,
        cam: { ...this.state.cam }, u: this.unitsPerPx(this.state.cam.z) };
      this.setState({ grabbing: true });
    } else if (this._ptrs.size === 2) {
      this._drag = null;
      const s = this.pinchSpan();
      this._pinch = { d: s.d, z: this.state.cam.z, wp: this.toWorld(s.mx, s.my) };
    }
  };
  onMove = e => {
    if (!this._ptrs.has(e.pointerId)) return;
    this._ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const lv = this.lv(); if (!lv) return;
    const L = this.layout(lv);
    if (this._pinch && this._ptrs.size >= 2) {
      const s = this.pinchSpan(), zb = this.zBounds(L);
      const z = Math.max(zb.min, Math.min(zb.max, this._pinch.z * (s.d / (this._pinch.d || 1))));
      return this.setCam(this.camFor(this._pinch.wp, s.mx, s.my, z), L);
    }
    const d = this._drag; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    this.setCam({ x: d.cam.x - dx * d.u, y: d.cam.y - dy * d.u, z: d.cam.z }, L);
  };
  onUp = e => {
    this._ptrs.delete(e.pointerId);
    if (this._ptrs.size < 2) this._pinch = null;
    const d = this._drag;
    this._drag = null;
    this.setState({ grabbing: false });
    if (d && d.moved < 6 && performance.now() - d.t < 400) this.pick(e.clientX, e.clientY);
  };
  /* ---- minimap: drag the frame around the whole house ---- */
  onMapDown = e => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    this._mapDrag = true;
    this.jumpMap(e);
  };
  onMapMove = e => { if (this._mapDrag) { e.stopPropagation(); this.jumpMap(e); } };
  onMapUp = e => { e.stopPropagation(); this._mapDrag = false; };
  jumpMap(e) {
    const lv = this.lv(); if (!lv || !this._map) return;
    const el = e.currentTarget, m = el.getScreenCTM(); if (!m) return;
    const p = el.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    cancelAnimationFrame(this._raf); clearTimeout(this._shot);
    this.setCam({ ...this._map.toWorld(q.x, q.y), z: this.state.cam.z }, this.layout(lv));
  }

  pick(cx, cy) {
    const q = this.toWorld(cx, cy); if (!q || !this._pos) return;
    let best = -1, bd = Infinity;
    this._pos.forEach((n, i) => { const d = Math.hypot(n.x - q.x, n.y - q.y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd <= this._hit) this.tap(best);
  }

  cable(A, B) {
    const s = CABLE_SAG;
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const sag = Math.abs(B.x - A.x) * s + 3;
    return { d: 'M ' + A.x + ' ' + A.y + ' Q ' + mx + ' ' + (my + sag) + ' ' + B.x + ' ' + B.y, mx, my: my + sag / 2 };
  }

  share() {
    const r = this.state.results;
    const glyphs = r.map(x => (x === 'perfect' ? '🐾' : '⬜')).join('');
    const n = r.filter(x => x === 'perfect').length;
    return 'CATASTROPHE INC. #' + this.day() + '\n' + glyphs + '  ' + n + '/7 on budget';
  }
  copyShare() {
    const t = this.share();
    const done = () => { this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else done();
  }

  /* ---- derived render values, mirrors the design's renderVals() ---- */
  renderVals() {
    const lv = this.lv(), st = this.state, hint = st.hint;
    const active = t => hint && ((t === 1 && hint.kind === 'leaf') || (t === 2 && hint.kind === 'proof') || (t === 3 && hint.kind === 'reveal'));
    const vals = {
      levelNo: st.idx + 1, stars: lv ? '✦'.repeat(lv.stars) : '',
      plaque: lv ? SITES[st.idx] : 'DISPATCHING CREW…',
      box: '0 0 ' + this.camW() + ' ' + CAM_H, view: { x: 0, y: 0, w: this.camW(), h: CAM_H },
      edges: [], sprites: [], proof: [], map: null,
      floor: { x: 0, y: 0, w: this.camW(), h: CAM_H },
      house: null, rooms: [], walls: [], doors: [], props: [],
      used: st.placed.length, par: lv ? lv.k : 0, litCount: 0, edgeCount: lv ? lv.edges.length : 0,
      usedColor: '#FFF3D8', msg: st.msg, msgColor: '#C9B8E0',
      steps: [
        { n: 1, head: 'PADS ARE EMPTY.', body: 'Nothing happens until you put a cat on one.' },
        { n: 2, head: 'COVER EVERY PATH.', body: 'A path needs a cat on at least one of its two pads.' },
        { n: 3, head: 'BILL BY THE HEAD.', body: 'Match the budget and the invoice reads purr-fect.' },
      ],
      overLabel: lv ? (lv.k + 1) + ' CATS' : '—',
      parLabel: lv ? lv.k + ' CATS' : '—',
      hints: [1, 2, 3].map(t => ({
        tier: t, label: ['SURVEY', 'ESTIMATE', 'INSIDER'][t - 1],
        bg: active(t) ? '#FFD469' : '#F4E4C4', ink: '#3E2718',
      })),
      pips: [0, 1, 2, 3, 4, 5, 6].map(i => ({
        i, n: i + 1,
        lift: i === st.idx ? 0 : 4, dy: i === st.idx ? 4 : 0,
        ink: st.results[i] || i === st.idx ? '#2A1524' : '#C9B8E0',
        fill: i === st.idx ? '#FFD469' : st.results[i] === 'perfect' ? '#C877D8'
          : st.results[i] === 'over' ? '#E8A34A' : this.state.levels[i] ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)',
      })),
      /* the overlays are sized in screen px, so they have to shrink with the board */
      ui: (() => {
        const k = Math.max(0.52, Math.min(1, st.boardW / 620));
        return { k, pad: Math.round(12 * k), gap: Math.round(6 * k), btn: Math.round(34 * k), font: Math.max(10, Math.round(14 * k)) };
      })(),
      tools: [
        { k: 'out', t: '–', label: 'zoom out', go: () => this.zoomBy(0.8) },
        { k: 'in', t: '+', label: 'zoom in', go: () => this.zoomBy(1.25) },
        { k: 'fit', t: 'FIT', label: 'frame the whole site', go: () => this.fit() },
        { k: 'exp', t: st.expanded ? '↘↖' : '↖↘', label: st.expanded ? 'shrink the board' : 'expand the board',
          go: () => this.setState(s => ({ expanded: !s.expanded })) },
      ],
      showShare: st.results.filter(Boolean).length === 7,
      shareText: this.share(), copyLabel: st.copied ? 'COPIED!' : 'COPY INVOICE',
      banner: '', bannerBg: 'rgba(255,255,255,.08)', bannerInk: '#F4E4C4',
      nextBg: 'rgba(255,255,255,.22)', nextLabel: 'NEXT', nextO: 0.45,
    };
    vals.msgColor = st.msg && st.msg.indexOf('PAYROLL') === 0 ? '#FF8FA8' : '#FFD469';
    if (!lv) return vals;

    const L = this.layout(lv), pos = L.pos, pset = new Set(st.placed);
    /* the sticker cats stand above their node point, so keep the tap target generous */
    this._pos = pos; this._hit = Math.max(26, L.sp * 0.46);

    /* the camera frame, as a viewBox */
    const cam = st.cam, vw = this.camW() / cam.z, vh = CAM_H / cam.z;
    const view = { x: cam.x - vw / 2, y: cam.y - vh / 2, w: vw, h: vh };
    vals.view = view;
    vals.box = view.x + ' ' + view.y + ' ' + vw + ' ' + vh;
    /* the ground outside the building is drawn over the frame, so it always
       covers it however far you pan */
    vals.floor = { x: view.x - vw * 0.1, y: view.y - vh * 0.1, w: vw * 1.2, h: vh * 1.2 };
    /* anything outside the frame grown by 30% each way isn't drawn at all */
    const seen = (x0, y0, x1, y1) =>
      x1 > view.x - vw * 0.3 && x0 < view.x + vw * 1.3 && y1 > view.y - vh * 0.3 && y0 < view.y + vh * 1.3;

    /* the building: everything here was built once, in layout(), so a frame
       only ever filters it */
    const P = L.plan;
    vals.house = P;
    vals.rooms = P.rooms.filter(r => seen(r.x, r.y, r.x + r.w, r.y + r.h));
    const shown = new Set(vals.rooms.map(r => r.id));
    vals.walls = P.wallRects.filter(w => seen(w.x, w.y, w.x + w.w, w.y + w.h));
    vals.doors = P.doors.filter(d => seen(d.x, d.y, d.x + d.w, d.y + d.h));
    vals.props = P.props.filter(q => shown.has(q.room));

    const litE = this.litSet(lv, st.placed);
    vals.litCount = litE.size;
    vals.usedColor = st.placed.length > lv.k ? '#FF8FA8' : st.placed.length === lv.k ? '#8CE8B0' : '#FFF3D8';

    const catS = CAT_S, objS = THING_S;

    lv.edges.forEach(([u, v], i) => {
      const on = litE.has(i);
      const ou = pset.has(u) ? st.placed.indexOf(u) : -1, ov = pset.has(v) ? st.placed.indexOf(v) : -1;
      const flip = ov > ou;
      const A = pos[flip ? v : u], B = pos[flip ? u : v];
      if (!seen(Math.min(A.x, B.x) - 60, Math.min(A.y, B.y) - 60, Math.max(A.x, B.x) + 60, Math.max(A.y, B.y) + 60)) return;
      const c = this.cable(A, B);
      vals.edges.push({
        key: i, d: c.d, off: on ? 0 : 1, on,
        w1: +(15 * catS).toFixed(1), w2: +(6 * catS).toFixed(1), w3: +(26 * catS).toFixed(1),
        w4: +(13 * catS).toFixed(1), w5: +(4.4 * catS).toFixed(1),
        dash: (11 * catS).toFixed(1) + ' ' + (11 * catS).toFixed(1),
        flow: (5 * catS).toFixed(1) + ' ' + (16 * catS).toFixed(1),
      });
      const t = THINGS[P.edgeThing[i]] || THINGS[(u * 7 + v * 3 + i) % THINGS.length];
      vals.sprites.push({
        thing: true, key: 't' + i, base: c.my + THING_FOOT * objS,
        x: c.mx, y: c.my, s: objS, dustO: on ? 1 : 0,
        label: t.label, idle: t.idle, wobble: t.wobble, hit: t.hit, broken: t.broken,
        /* untouched things teeter; a smashed one plays idle -> wobble -> hit ->
           broken once and holds the wreckage */
        body: on ? 'cc-tumble .5s ease-out forwards'
          : 'cc-teeter 4.2s ease-in-out ' + (-0.7 * (i % 6)).toFixed(1) + 's infinite',
        f0: on ? 'cc-break-0 .5s steps(1, end) forwards' : 'none',
        f1: on ? 'cc-break-1 .5s steps(1, end) forwards' : 'none',
        f2: on ? 'cc-break-2 .5s steps(1, end) forwards' : 'none',
        f3: on ? 'cc-break-3 .5s steps(1, end) forwards' : 'none',
        idleO: on ? 0 : 1,
      });
    });

    if (hint && hint.kind === 'proof')
      vals.proof = hint.edges.map(i => {
        const [u, v] = lv.edges[i];
        return { key: i, d: this.cable(pos[u], pos[v]).d };
      });

    lv.nodes.forEach((_, i) => {
      const p = pos[i];
      if (!seen(p.x - 40, p.y + CAT_TOP * catS, p.x + 40, p.y + 30)) return;
      const on = pset.has(i);
      /* 5 is coprime with the breed count, so neighbouring cats differ; the
         level index shifts the whole cast so each house has its own line-up */
      const b = BREEDS[(i * 5 + st.idx * 2) % BREEDS.length];
      const pulsing = hint && hint.kind === 'leaf' && (i === hint.leaf || i === hint.forced);
      const revealed = hint && hint.kind === 'reveal' && i === hint.node;
      vals.sprites.push({
        thing: false, key: 'n' + i, base: p.y + CAT_FOOT * catS,
        i, x: p.x, y: p.y, s: catS,
        name: b.name, wakeA: b.wakeA, wakeB: b.wakeB,
        on: on ? 1 : 0,
        /* an empty pad shows a slowly-turning dashed ring + paw stencil; once a
           cat is hired the pad fades out under it */
        slotO: on ? 0 : 0.9,
        slotAnim: on ? 'none' : 'cc-slotspin 3.6s linear infinite',
        haloO: on ? 0.2 : 0, ringO: on ? 1 : 0,
        glow: on ? 'cc-glow 1.8s ease-in-out infinite' : 'none',
        bob: on ? 'cc-pounce .7s ease-in-out infinite' : 'none',
        frameA: on ? 'cc-frame-a .7s steps(1, end) infinite' : 'none',
        frameB: on ? 'cc-frame-b .7s steps(1, end) infinite' : 'none',
        pulseR: 26, pulseO: pulsing || revealed ? 1 : 0,
        anim: pulsing || revealed ? 'cc-pulse 1.15s ease-in-out infinite' : 'none',
        focusO: st.kbd && i === st.focus ? 0.9 : 0,
      });
    });
    /* painter's order: whoever stands further back is drawn first, so a cat in
       front overlaps the cat and the smashables behind it */
    vals.sprites.sort((a, b) => a.base - b.base);

    /* the minimap only earns its space when the house doesn't fit in the frame */
    const C = L.content;
    const covered = view.x <= C.x + 1 && view.y <= C.y + 1
      && view.x + view.w >= C.x + C.w - 1 && view.y + view.h >= C.y + C.h - 1;
    if (this.zBounds(L).fit < Z_PLAY && !covered) {
      const W = L.content, k = Math.min(MAP_W / W.w, MAP_H / W.h);
      const px = q => ({ x: (q.x - W.x) * k, y: (q.y - W.y) * k });
      vals.map = {
        w: W.w * k, h: W.h * k,
        /* the floorplan in miniature: once the board is a warren of rooms, the
           room boxes are what tell you where in the house you are */
        rooms: P.rooms.map(r => ({ key: r.id, x: (r.x - W.x) * k, y: (r.y - W.y) * k, w: r.w * k, h: r.h * k })),
        edges: lv.edges.map(([u, v], i) => {
          const a = px(pos[u]), b2 = px(pos[v]);
          return { key: i, x1: a.x, y1: a.y, x2: b2.x, y2: b2.y, on: litE.has(i) };
        }),
        nodes: pos.map((q, i) => ({ key: i, ...px(q), on: pset.has(i) })),
        view: { x: (view.x - W.x) * k, y: (view.y - W.y) * k, w: view.w * k, h: view.h * k },
        toWorld: (mx, my) => ({ x: W.x + mx / k, y: W.y + my / k }),
      };
    }
    this._map = vals.map;

    if (litE.size === lv.edges.length) {
      const perfect = st.placed.length <= lv.k;
      vals.banner = perfect ? 'SITE CLEARED — ON BUDGET ' + lv.k + '/' + lv.k : 'CLEARED — BUT ' + st.placed.length + '/' + lv.k + ' CATS';
      vals.bannerBg = perfect ? '#C877D8' : '#E8A34A';
      vals.bannerInk = '#2A1524';
      vals.nextBg = '#F4E4C4';
      vals.nextO = st.idx < 6 ? 1 : 0.45;
      vals.nextLabel = st.idx < 6 ? 'NEXT SITE' : 'WEEK DONE';
    } else {
      vals.banner = 'SITE ' + (st.idx + 1) + '/7 · BUDGET ' + lv.k + ' CATS';
      if (!st.msg && st.placed.length && st.placed.length >= lv.k) vals.msg = 'SOMETHING IS STILL STANDING…';
    }
    return vals;
  }

  /* ---- the work order: shown before play, and again via RE-READ WORK ORDER ---- */
  renderIntro() {
    const luckiest = "'Luckiest Guy', cursive";
    return (
      <div style={{ minHeight: '100vh', boxSizing: 'border-box', padding: '26px 16px 40px', color: '#F4E4C4', background: 'radial-gradient(120% 90% at 50% 0%, #2A1B3D 0%, #170F22 55%, #100A18 100%)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 18, borderBottom: '4px dashed rgba(247,179,43,.35)', paddingBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.82 }}>
              <span style={{ fontFamily: luckiest, fontSize: 15, letterSpacing: '.34em', color: '#C877D8', marginBottom: 8 }}>STRUCTURAL DEMOLITION</span>
              <span style={{ fontFamily: luckiest, fontSize: 74, color: '#F7B32B', WebkitTextStroke: '8px #2A1524', paintOrder: 'stroke fill', textShadow: '0 7px 0 #2A1524' }}>CATASTROPHE</span>
              <span style={{ fontFamily: luckiest, fontSize: 50, letterSpacing: '.04em', color: '#EADDF7', WebkitTextStroke: '8px #2A1524', paintOrder: 'stroke fill', textShadow: '0 7px 0 #2A1524' }}>INC.</span>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.16em', color: '#8E7AAE' }}>FELINE DIVISION · EST. 2019</span>
              <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.4, color: '#F4E4C4', textWrap: 'pretty' }}>We don't own a wrecking ball. We own <span style={{ color: '#F06BFF', fontWeight: 900 }}>cats</span>.</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'stretch' }}>
            <div style={{ flex: '3 1 420px', minWidth: 300, display: 'flex', flexDirection: 'column' }}>
              <div style={{ alignSelf: 'flex-start', background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: '9px 9px 0 0', boxShadow: '0 4px 0 #2A1524', padding: '5px 20px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.06em', color: '#FFD469', position: 'relative', zIndex: 2 }}>WORK ORDER #{this.day()}</div>
              <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 8px 16px', boxShadow: '0 6px 0 #2A1524, inset 0 0 36px rgba(150,110,60,.24)', padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontFamily: luckiest, fontSize: 25, lineHeight: 1.18, color: '#3E2718', textWrap: 'pretty' }}>THE CLIENT WANTS THE INSIDE OF THIS HOUSE <span style={{ color: '#8A3FC0' }}>GONE BY FRIDAY.</span></div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5, color: '#5A3E27', textWrap: 'pretty' }}>Every fixture on site sits on a path between two <span style={{ fontWeight: 900, color: '#8A3FC0' }}>deployment pads</span>. Drop a cat on either end of a path and that fixture is scrap. Cats bill by the head, so hire the fewest that still flattens the lot.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {BRIEF.map(s => (
                    <div key={s.n} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                      <span style={{ flex: 'none', width: 26, height: 26, borderRadius: 7, background: '#6E3FA3', border: '2.5px solid #2A1524', color: '#FFD469', fontFamily: luckiest, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                      <div>
                        <div style={{ fontFamily: luckiest, fontSize: 16, color: '#3E2718', lineHeight: 1.2 }}>{s.head}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#6A4A30', lineHeight: 1.4 }}>{s.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '3px dashed rgba(62,39,24,.3)', paddingTop: 13, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontFamily: luckiest, fontSize: 15, color: '#8A3FC0' }}>7 SITES · ONE WORKING WEEK</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#7A5638' }}>Come in on budget and the invoice reads PURR-FECT.</span>
                </div>
              </div>
            </div>

            <div style={{ flex: '2 1 300px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ flex: 1, background: 'repeating-linear-gradient(96deg, #6B4730 0 46px, #664129 46px 48px, #6E4A32 48px 94px, #5E3B25 94px 96px)', border: '5px solid #34200F', borderRadius: 16, boxShadow: '0 7px 0 #1E1208, inset 0 0 60px rgba(0,0,0,.55)', padding: 12 }}>
                <svg viewBox="0 0 300 210" width="100%" aria-label="how a deployment works" style={{ display: 'block' }}>
                  <text x={14} y={22} fontFamily="Luckiest Guy, cursive" fontSize={13} fill="#FFD469" letterSpacing={2}>EMPTY PAD</text>
                  <text x={176} y={22} fontFamily="Luckiest Guy, cursive" fontSize={13} fill="#F06BFF" letterSpacing={2}>CAT ON IT</text>
                  <g transform="translate(62 110)">
                    <ellipse cx={0} cy={20} rx={28} ry={9} fill="#000" opacity={.3} />
                    <circle cx={0} cy={8} r={26} fill="rgba(0,0,0,.35)" stroke="#FFD469" strokeWidth={3} strokeDasharray="9 8" opacity={.85} />
                    <g fill="#FFD469" opacity={.6} transform="translate(0 8) scale(1.25)">
                      <ellipse cx={0} cy={3} rx={6.4} ry={5} />
                      <circle cx={-6} cy={-5} r={2.5} />
                      <circle cx={-2} cy={-8.4} r={2.5} />
                      <circle cx={2} cy={-8.4} r={2.5} />
                      <circle cx={6} cy={-5} r={2.5} />
                    </g>
                  </g>
                  <g transform="translate(126 116)">
                    <path d="M -10 0 L 22 0" stroke="#2A1524" strokeWidth={9} strokeLinecap="round" />
                    <path d="M -10 0 L 22 0" stroke="#FFF6E4" strokeWidth={4} strokeLinecap="round" />
                    <path d="M 14 -9 L 26 0 L 14 9 Z" fill="#FFF6E4" stroke="#2A1524" strokeWidth={2.4} strokeLinejoin="round" />
                  </g>
                  <g transform="translate(228 118)">
                    <ellipse cx={0} cy={CAT_FOOT + 8} rx={26} ry={8} fill="#000" opacity={.3} />
                    <circle cx={0} cy={10} r={26} fill="#F06BFF" opacity={.18} />
                    <ellipse cx={0} cy={CAT_FOOT + 6} rx={22} ry={7} fill="none" stroke="#F06BFF" strokeWidth={3.4} />
                    <image href={INTRO_CAT.wakeA} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D}>
                      <title>{INTRO_CAT.name} — on site</title>
                    </image>
                  </g>
                  <g transform="translate(228 180)">
                    <ellipse cx={0} cy={THING_FOOT + 2} rx={16} ry={5} fill="#000" opacity={.3} />
                    <image href={INTRO_THING.broken} x={-THING_D / 2} y={THING_TOP} width={THING_D} height={THING_D}>
                      <title>{INTRO_THING.label} — smashed</title>
                    </image>
                    <circle cx={-16} cy={0} r={2.6} fill="#FFE9C4" opacity={.8} />
                    <circle cx={15} cy={-3} r={2.2} fill="#FFE9C4" opacity={.6} />
                  </g>
                </svg>
              </div>
              <div style={{ background: 'rgba(255,255,255,.06)', border: '3px solid #2A1524', borderRadius: 14, padding: '12px 14px', fontSize: 12.5, fontWeight: 800, lineHeight: 1.6, color: '#C9B8E0' }}>CATASTROPHE INC. is not liable for curtains, ankles, or emotional damage. Cats are non-refundable and cannot be reasoned with.</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <button type="button" onClick={() => this.setState({ screen: 'game' })}
              style={{ minHeight: 68, padding: '0 34px', background: '#FFD469', border: '4px solid #2A1524', borderRadius: 16, boxShadow: '0 6px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: 26, letterSpacing: '.05em', cursor: 'pointer' }}>CLOCK IN</button>
            <span style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: '.1em', color: '#8E7AAE' }}>OR PRESS ENTER · SITE {this.state.idx + 1} IS WAITING</span>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.screen === 'intro') return this.renderIntro();
    const v = this.renderVals();
    const luckiest = "'Luckiest Guy', cursive";
    return (
      <>
      <div style={{ minHeight: '100vh', background: 'radial-gradient(120% 90% at 50% 0%, #2A1B3D 0%, #170F22 55%, #100A18 100%)', color: '#F4E4C4', padding: '18px 14px 30px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>

          <aside style={{ flex: '1 1 250px', minWidth: 250, display: this.state.expanded ? 'none' : 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.84, paddingTop: 2 }}>
              <span style={{ fontFamily: luckiest, fontSize: 40, letterSpacing: '.01em', color: '#F7B32B', WebkitTextStroke: '6px #2A1524', paintOrder: 'stroke fill', textShadow: '0 5px 0 #2A1524' }}>CATASTROPHE</span>
              <span style={{ fontFamily: luckiest, fontSize: 34, letterSpacing: '.04em', color: '#EADDF7', WebkitTextStroke: '6px #2A1524', paintOrder: 'stroke fill', textShadow: '0 5px 0 #2A1524' }}>INC.</span>
            </div>

            <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 14px 6px 16px', boxShadow: '0 5px 0 #2A1524, inset 0 0 26px rgba(150,110,60,.25)', padding: '13px 15px', transform: 'rotate(-1.2deg)' }}>
              <div style={{ fontFamily: luckiest, fontSize: 18, lineHeight: 1.22, color: '#3E2718', textWrap: 'pretty' }}>HIRE THE FEWEST CATS THAT STILL <span style={{ color: '#8A3FC0' }}>FLATTEN THE LOT.</span></div>
            </div>

            <div style={{ background: 'linear-gradient(#FFF7E6, #F2E3C2)', border: '3px solid #2A1524', borderRadius: '16px 16px 16px 4px', boxShadow: '0 5px 0 #2A1524', padding: '12px 14px', fontSize: 14, fontWeight: 700, lineHeight: 1.45, color: '#4A3120' }}>
              Tap an empty <span style={{ color: '#8A3FC0', fontWeight: 900 }}>pad</span> to deploy a cat. Every fixture on a path it touches goes down.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ alignSelf: 'flex-start', background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: 8, boxShadow: '0 4px 0 #2A1524', padding: '4px 14px', fontFamily: luckiest, fontSize: 14, letterSpacing: '.06em', color: '#FFD469' }}>SITES</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {v.pips.map(p => (
                  <button key={p.i} type="button" onClick={() => this.go(p.i)} aria-label={'site ' + (p.i + 1)}
                    style={{ flex: 1, minHeight: 40, background: p.fill, border: '3px solid #2A1524', borderRadius: 10, padding: 0, cursor: 'pointer', color: p.ink, fontFamily: luckiest, fontSize: 15, boxShadow: '0 ' + p.lift + 'px 0 #2A1524', transform: 'translateY(' + p.dy + 'px)' }}>{p.n}</button>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => this.setState({ screen: 'intro' })}
              style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 15px', background: 'rgba(255,255,255,.08)', border: '3px solid #2A1524', borderRadius: 12, color: '#C9B8E0', fontSize: 12, fontWeight: 900, letterSpacing: '.1em', cursor: 'pointer' }}>RE-READ WORK ORDER</button>
          </aside>

          <main style={{ flex: '5 1 460px', minWidth: 300, maxWidth: this.state.expanded ? 'none' : 780, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <div style={{ background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: 10, boxShadow: '0 4px 0 #2A1524', padding: '3px 22px', fontFamily: luckiest, fontSize: 17, letterSpacing: '.05em', color: '#FFD469', position: 'relative', zIndex: 2 }}>SITE {v.levelNo} <span style={{ color: '#F06BFF' }}>{v.stars}</span></div>
              <div style={{ marginTop: -6, width: '92%', background: 'linear-gradient(#F6E8CA, #E8D3A6)', border: '3px solid #2A1524', borderRadius: '3px 3px 10px 10px', boxShadow: '0 5px 0 #2A1524', padding: '9px 12px 6px', textAlign: 'center', fontFamily: luckiest, fontSize: 20, letterSpacing: '.02em', color: '#3E2718' }}>{v.plaque}</div>
            </div>

            <div style={{ background: '#3A2416', border: '6px solid #34200F', borderRadius: 18, boxShadow: '0 8px 0 #1E1208, inset 0 0 70px rgba(0,0,0,.55)', padding: 6, position: 'relative', aspectRatio: CAM_A, maxHeight: '76vh', boxSizing: 'border-box' }}>
              <div style={{ position: 'absolute', inset: 6, borderRadius: 12, pointerEvents: 'none', zIndex: 3, boxShadow: 'inset 0 0 70px rgba(20,8,2,.72), inset 0 0 22px rgba(20,8,2,.5)' }}></div>
              <svg ref={this.svgRef} viewBox={v.box} width="100%" height="100%" role="application" tabIndex={0} aria-label="cat cover grid"
                onPointerDown={this.onDown} onPointerMove={this.onMove} onPointerUp={this.onUp} onPointerCancel={this.onUp}
                style={{ display: 'block', touchAction: 'none', outline: 'none', borderRadius: 12, cursor: this.state.grabbing ? 'grabbing' : 'grab' }}>
                <defs>
                  <pattern id="cc-planks" width={96} height={430} patternUnits="userSpaceOnUse" patternTransform="rotate(6)">
                    <rect width={96} height={430} fill="#6B4730" />
                    <rect x={46} width={2} height={430} fill="#5A3A24" />
                    <rect x={48} width={46} height={430} fill="#6E4A32" />
                    <rect x={94} width={2} height={430} fill="#563623" />
                    <rect y={150} width={46} height={2} fill="#553622" opacity={.75} />
                    <rect x={48} y={318} width={46} height={2} fill="#553622" opacity={.75} />
                    <rect x={20} width={7} height={430} fill="#71503A" opacity={.5} />
                    <rect x={66} width={5} height={430} fill="#654327" opacity={.5} />
                  </pattern>
                  {/* objectBoundingBox by default, so this one def gives every
                      room its own pool of light and its own dark corners */}
                  <radialGradient id="cc-pool" cx="50%" cy="42%" r="66%">
                    <stop offset="0%" stopColor="#FFD9A0" stopOpacity={.20} />
                    <stop offset="55%" stopColor="#FFB870" stopOpacity={.07} />
                    <stop offset="100%" stopColor="#1A0E06" stopOpacity={.30} />
                  </radialGradient>
                  <radialGradient id="cc-contact">
                    <stop offset="0%" stopColor="#12060B" stopOpacity={.5} />
                    <stop offset="60%" stopColor="#12060B" stopOpacity={.28} />
                    <stop offset="100%" stopColor="#12060B" stopOpacity={0} />
                  </radialGradient>
                  {/* one floor pattern per room material; all world-anchored,
                      so they stay put under the camera instead of swimming */}
                  <pattern id="cc-tile" width={52} height={52} patternUnits="userSpaceOnUse">
                    <rect width={52} height={52} fill="#8C7B63" />
                    <rect width={25} height={25} fill="#9C8B71" />
                    <rect x={27} y={27} width={25} height={25} fill="#9C8B71" />
                  </pattern>
                  <pattern id="cc-checker" width={44} height={44} patternUnits="userSpaceOnUse">
                    <rect width={44} height={44} fill="#7E8A92" />
                    <rect width={21} height={21} fill="#93A0A8" />
                    <rect x={23} y={23} width={21} height={21} fill="#93A0A8" />
                  </pattern>
                  <pattern id="cc-carpet" width={26} height={26} patternUnits="userSpaceOnUse">
                    <rect width={26} height={26} fill="#6E5348" />
                    <circle cx={7} cy={7} r={2.2} fill="#7A5C50" />
                    <circle cx={19} cy={17} r={2.2} fill="#7A5C50" />
                    <circle cx={13} cy={23} r={1.6} fill="#654A40" />
                  </pattern>
                  <pattern id="cc-concrete" width={38} height={38} patternUnits="userSpaceOnUse">
                    <rect width={38} height={38} fill="#5E5147" />
                    <circle cx={9} cy={12} r={1.8} fill="#6A5C51" />
                    <circle cx={28} cy={26} r={2.2} fill="#544840" />
                    <circle cx={20} cy={6} r={1.4} fill="#6A5C51" />
                  </pattern>
                  <radialGradient id="cc-void" cx="50%" cy="45%" r="70%">
                    <stop offset="0%" stopColor="#241531" />
                    <stop offset="100%" stopColor="#120A18" />
                  </radialGradient>
                </defs>

                {/* the ground the building stands on */}
                <rect x={v.floor.x} y={v.floor.y} width={v.floor.w} height={v.floor.h} fill="url(#cc-void)" />

                {/* the building: floors, furniture and walls, all of it under
                    the paths and dimmed as one group so the puzzle stays loud */}
                {v.house && (
                  <g opacity={HOUSE_DIM} style={{ pointerEvents: 'none' }}>
                    <rect x={v.house.outer.x} y={v.house.outer.y} width={v.house.outer.w} height={v.house.outer.h}
                      rx={10} fill="#241610" />
                    {v.rooms.map(r => (
                      <rect key={'f' + r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={FLOOR_FILL[r.floor] || FLOOR_FILL.wood} />
                    ))}
                    {v.rooms.map(r => (
                      <rect key={'l' + r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#cc-pool)" />
                    ))}
                    {v.props.map(q => propArt(q))}
                    {/* one shadow pass then one body pass over the same walls —
                        cheaper and steadier than an SVG drop shadow */}
                    {v.walls.map(w => (
                      <rect key={'ws' + w.key} x={w.x + 3} y={w.y + 5} width={w.w} height={w.h} fill={WALL_SHADOW} opacity={.5} />
                    ))}
                    {v.walls.map(w => (
                      <rect key={'w' + w.key} x={w.x} y={w.y} width={w.w} height={w.h} fill={w.ext ? WALL_EXT : WALL_INK} />
                    ))}
                    {v.doors.map(d => (
                      <g key={d.key}>
                        <rect x={d.x} y={d.y} width={d.w} height={d.h} fill="#2A1A12" opacity={.35} />
                        {d.dir === 'v'
                          ? <>
                              <rect x={d.x} y={d.y} width={d.w} height={5} fill={WALL_EXT} />
                              <rect x={d.x} y={d.y + d.h - 5} width={d.w} height={5} fill={WALL_EXT} />
                            </>
                          : <>
                              <rect x={d.x} y={d.y} width={5} height={d.h} fill={WALL_EXT} />
                              <rect x={d.x + d.w - 5} y={d.y} width={5} height={d.h} fill={WALL_EXT} />
                            </>}
                      </g>
                    ))}
                  </g>
                )}

                {v.edges.map(e => (
                  <g key={e.key}>
                    <path d={e.d} fill="none" stroke="#241409" strokeWidth={e.w1} strokeLinecap="round" opacity={.92} />
                    <path d={e.d} fill="none" stroke="#D6C2A6" strokeWidth={e.w2} strokeLinecap="round" strokeDasharray={e.dash} opacity={.85} />
                    <path d={e.d} pathLength="1" fill="none" stroke="#F06BFF" strokeWidth={e.w3} strokeOpacity={.22} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={e.off} style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(.15,.85,.25,1)' }} />
                    <path d={e.d} pathLength="1" fill="none" stroke="#C64BE8" strokeWidth={e.w4} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={e.off} style={{ transition: 'stroke-dashoffset 420ms cubic-bezier(.15,.85,.25,1)' }} />
                    <path d={e.d} pathLength="1" fill="none" stroke="#FFEFFF" strokeWidth={e.w5} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={e.off} style={{ transition: 'stroke-dashoffset 360ms cubic-bezier(.15,.85,.25,1)' }} />
                    {e.on && (
                      <path d={e.d} fill="none" stroke="#FFFFFF" strokeWidth={e.w5} strokeLinecap="round" strokeDasharray={e.flow} style={{ animation: 'cc-dash 800ms linear infinite' }} />
                    )}
                  </g>
                ))}

                {v.proof.map(m => (
                  <path key={m.key} d={m.d} fill="none" stroke="#FFD469" strokeWidth={4.5} strokeLinecap="round" strokeDasharray="9 8" style={{ animation: 'cc-dash 900ms linear infinite' }} />
                ))}

                {/* cats and smashables share one depth-sorted pass, so whoever
                    stands in front overlaps whoever stands behind */}
                {v.sprites.map(o => (o.thing ? (
                  <g key={o.key} transform={'translate(' + o.x + ' ' + o.y + ') scale(' + o.s + ')'}>
                    <ellipse cx={0} cy={11} rx={17} ry={6} fill="url(#cc-contact)" />
                    <g style={{ animation: o.body, transformOrigin: '0px ' + THING_FOOT + 'px' }}>
                      <image href={o.idle} x={-THING_D / 2} y={THING_TOP} width={THING_D} height={THING_D} opacity={o.idleO} style={{ animation: o.f0 }}>
                        <title>{o.label}</title>
                      </image>
                      <image href={o.wobble} x={-THING_D / 2} y={THING_TOP} width={THING_D} height={THING_D} opacity={0} style={{ animation: o.f1 }} />
                      <image href={o.hit} x={-THING_D / 2} y={THING_TOP} width={THING_D} height={THING_D} opacity={0} style={{ animation: o.f2 }} />
                      <image href={o.broken} x={-THING_D / 2} y={THING_TOP} width={THING_D} height={THING_D} opacity={0} style={{ animation: o.f3 }} />
                    </g>
                    <g opacity={o.dustO}>
                      <circle cx={-13} cy={6} r={2.6} fill="#FFE9C4" style={{ animation: 'cc-dust 1.4s ease-out infinite' }} />
                      <circle cx={12} cy={4} r={2.2} fill="#FFE9C4" style={{ animation: 'cc-dust 1.4s .5s ease-out infinite' }} />
                      <path d="M 0 -18 l 2 4 l 4 1 l -4 1.6 l -2 4 l -2 -4 l -4 -1.6 l 4 -1 Z" fill="#FFEFAF" style={{ animation: 'cc-spark 1.1s ease-in-out infinite' }} />
                    </g>
                  </g>
                ) : (
                  <g key={o.key} transform={'translate(' + o.x + ' ' + o.y + ') scale(' + o.s + ')'}>
                    <circle cx={0} cy={-8} r={o.pulseR} fill="none" stroke="#FFD469" strokeWidth={3} opacity={o.pulseO} style={{ animation: o.anim }} />
                    <ellipse cx={0} cy={18} rx={22} ry={7.5} fill="url(#cc-contact)" />
                    {/* empty deployment pad: a slowly-turning dashed ring with a paw
                        stencil, fades out once a cat is hired */}
                    <circle cx={0} cy={4} r={20} fill="rgba(0,0,0,.4)" stroke="#FFD469" strokeWidth={2.6} strokeDasharray="9 8"
                      opacity={o.slotO} style={{ animation: o.slotAnim, transformOrigin: '0px 4px', transition: 'opacity 160ms ease-out' }} />
                    <g opacity={o.slotO} fill="#FFD469" transform="translate(0 4)" style={{ transition: 'opacity 160ms ease-out' }}>
                      <ellipse cx={0} cy={3} rx={5.6} ry={4.4} />
                      <circle cx={-5.2} cy={-4.4} r={2.2} />
                      <circle cx={-1.8} cy={-7.4} r={2.2} />
                      <circle cx={1.8} cy={-7.4} r={2.2} />
                      <circle cx={5.2} cy={-4.4} r={2.2} />
                    </g>
                    <circle cx={0} cy={-2} r={27} fill="#F06BFF" opacity={o.haloO} style={{ animation: o.glow }} />
                    <ellipse cx={0} cy={17} rx={22} ry={7} fill="none" stroke="#F06BFF" strokeWidth={3.5} opacity={o.ringO} />
                    <circle id={'cc-bloom-' + o.i} cx={0} cy={0} r={8} fill="none" stroke="#FFEFFF" strokeWidth={3} opacity={0} />
                    {!!o.on && (
                      <g style={{ animation: 'cc-drop 480ms cubic-bezier(.2,1.2,.3,1) both', transformOrigin: '0px ' + CAT_FOOT + 'px' }}>
                        <g style={{ animation: o.bob, transformOrigin: '0px ' + CAT_FOOT + 'px' }}>
                          <image href={o.wakeA} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0} style={{ animation: o.frameA }}>
                            <title>{o.name} — on site</title>
                          </image>
                          <image href={o.wakeB} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0} style={{ animation: o.frameB }} />
                        </g>
                      </g>
                    )}
                    <g opacity={o.on}>
                      <path d="M -26 -18 l 3.6 1.4 l 1.4 3.6 l 1.4 -3.6 l 3.6 -1.4 l -3.6 -1.4 l -1.4 -3.6 l -1.4 3.6 Z" fill="#FFD469" style={{ animation: 'cc-spark 1.2s ease-in-out infinite' }} />
                      <path d="M 19 -30 l 3 1.2 l 1.2 3 l 1.2 -3 l 3 -1.2 l -3 -1.2 l -1.2 -3 l -1.2 3 Z" fill="#F06BFF" style={{ animation: 'cc-spark 1.5s .3s ease-in-out infinite' }} />
                    </g>
                    <rect x={-29} y={-34} width={58} height={56} rx={15} fill="none" stroke="#FFD469" strokeWidth={3} strokeDasharray="7 6" opacity={o.focusO} />
                  </g>
                )))}
              </svg>

              <div style={{ position: 'absolute', right: v.ui.pad, top: v.ui.pad, zIndex: 4, display: 'flex', gap: v.ui.gap }}>
                {v.tools.map(t => (
                  <button key={t.k} type="button" onClick={t.go} aria-label={t.label} title={t.label}
                    style={{ minWidth: v.ui.btn + 2, height: v.ui.btn, padding: '0 ' + Math.round(8 * v.ui.k) + 'px', background: '#F4E4C4', border: '3px solid #2A1524', borderRadius: 9, boxShadow: '0 3px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: v.ui.font, lineHeight: 1, cursor: 'pointer' }}>{t.t}</button>
                ))}
              </div>

              {v.map && (
                <svg width={(v.map.w + 12) * v.ui.k} height={(v.map.h + 12) * v.ui.k} viewBox={'-6 -6 ' + (v.map.w + 12) + ' ' + (v.map.h + 12)}
                  role="img" aria-label="house overview"
                  onPointerDown={this.onMapDown} onPointerMove={this.onMapMove} onPointerUp={this.onMapUp} onPointerCancel={this.onMapUp}
                  style={{ position: 'absolute', right: v.ui.pad, bottom: v.ui.pad, zIndex: 4, background: 'rgba(26,12,8,.82)', border: '3px solid #2A1524', borderRadius: 10, boxShadow: '0 3px 0 #2A1524', cursor: 'pointer', touchAction: 'none' }}>
                  {v.map.rooms.map(r => (
                    <rect key={'r' + r.key} x={r.x} y={r.y} width={r.w} height={r.h}
                      fill="rgba(244,228,196,.07)" stroke="rgba(244,228,196,.22)" strokeWidth={1} />
                  ))}
                  {v.map.edges.map(e => (
                    <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.on ? '#C64BE8' : '#8A7A6A'} strokeWidth={e.on ? 2.6 : 1.6} strokeLinecap="round" />
                  ))}
                  {v.map.nodes.map(n => (
                    <circle key={n.key} cx={n.x} cy={n.y} r={n.on ? 3.4 : 2.3} fill={n.on ? '#FFD469' : '#F4E4C4'} opacity={n.on ? 1 : .5} />
                  ))}
                  <rect x={v.map.view.x} y={v.map.view.y} width={v.map.view.w} height={v.map.view.h} rx={2}
                    fill="rgba(255,212,105,.13)" stroke="#FFD469" strokeWidth={1.8} />
                </svg>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: '1 1 190px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.06)', border: '3px solid #2A1524', borderRadius: 13, padding: '8px 13px' }}>
                <span style={{ fontFamily: luckiest, fontSize: 22, color: v.usedColor }}>{v.used}/{v.par}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#C9B8E0' }}>cats hired</span>
                <span style={{ marginLeft: 'auto', fontFamily: luckiest, fontSize: 22, color: '#F06BFF' }}>{v.litCount}/{v.edgeCount}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#C9B8E0' }}>wrecked</span>
              </div>
              <div style={{ flex: '1 1 170px', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right', fontSize: 13, fontWeight: 900, letterSpacing: '.02em', color: v.msgColor }}>{v.msg}</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {v.hints.map(h => (
                <button key={h.tier} type="button" onClick={() => this.hint(h.tier)}
                  style={{ flex: 1, minHeight: 52, background: h.bg, border: '3px solid #2A1524', borderRadius: 13, color: h.ink, fontSize: 13, fontWeight: 900, letterSpacing: '.04em', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 #2A1524' }}>
                  <span style={{ opacity: .6, fontSize: 9, fontWeight: 800, letterSpacing: '.12em' }}>CONSULT {h.tier}</span>
                  <span>{h.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <button type="button" onClick={() => this.reset()}
                style={{ minHeight: 56, padding: '0 18px', background: '#F4E4C4', border: '3px solid #2A1524', borderRadius: 14, color: '#3E2718', fontFamily: luckiest, fontSize: 15, letterSpacing: '.04em', cursor: 'pointer', boxShadow: '0 4px 0 #2A1524' }}>RECALL CREW</button>
              <div style={{ flex: 1, minHeight: 56, background: v.bannerBg, border: '3px solid #2A1524', borderRadius: 14, boxShadow: '0 4px 0 #2A1524', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 7px 0 15px', gap: 8 }}>
                <span style={{ fontFamily: luckiest, fontSize: 15, letterSpacing: '.02em', color: v.bannerInk }}>{v.banner}</span>
                <button type="button" onClick={() => this.next()}
                  style={{ height: 42, padding: '0 18px', background: v.nextBg, border: '3px solid #2A1524', borderRadius: 11, color: '#3E2718', fontFamily: luckiest, fontSize: 14, letterSpacing: '.04em', cursor: 'pointer', opacity: v.nextO }}>{v.nextLabel}</button>
              </div>
            </div>
          </main>

          <aside style={{ flex: '1 1 250px', minWidth: 250, display: this.state.expanded ? 'none' : 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ alignSelf: 'center', background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: 9, boxShadow: '0 4px 0 #2A1524', padding: '4px 18px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.05em', color: '#FFD469', position: 'relative', zIndex: 2 }}>SITE PROCEDURE</div>
            <div style={{ marginTop: -20, background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: 14, boxShadow: '0 5px 0 #2A1524, inset 0 0 30px rgba(150,110,60,.22)', padding: '22px 15px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {v.steps.map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 9 }}>
                  <span style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', background: '#6E3FA3', border: '2px solid #2A1524', color: '#FFD469', fontFamily: luckiest, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                  <div>
                    <div style={{ fontFamily: luckiest, fontSize: 14, color: '#3E2718', lineHeight: 1.2 }}>{s.head}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6A4A30', lineHeight: 1.35 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ alignSelf: 'center', background: '#C877D8', border: '3px solid #2A1524', borderRadius: 9, boxShadow: '0 4px 0 #2A1524', padding: '4px 18px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.05em', color: '#3E1B4A', position: 'relative', zIndex: 2 }}>THE INVOICE</div>
            <div style={{ marginTop: -20, background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: 14, boxShadow: '0 5px 0 #2A1524', padding: '22px 12px 12px', display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, padding: '9px 10px' }}>
                <div style={{ fontFamily: luckiest, fontSize: 13, color: '#3E2718' }}>{v.overLabel}</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#7A5638', lineHeight: 1.3 }}>OVER BUDGET — ACCOUNTS WILL CALL.</div>
              </div>
              <div style={{ flex: 1, background: '#EBD4F5', border: '2.5px solid #2A1524', borderRadius: 10, padding: '9px 10px' }}>
                <div style={{ fontFamily: luckiest, fontSize: 13, color: '#3E1B4A' }}>{v.parLabel}</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#6E3FA3', lineHeight: 1.3 }}>ON BUDGET — PURR-FECT.</div>
              </div>
            </div>

            {v.showShare && (
              <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: 14, boxShadow: '0 5px 0 #2A1524', padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ fontFamily: luckiest, fontSize: 13, letterSpacing: '.08em', color: '#8A3FC0' }}>WEEKLY INVOICE</div>
                <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.55, color: '#3E2718', whiteSpace: 'pre-wrap' }}>{v.shareText}</div>
                <button type="button" onClick={() => this.copyShare()}
                  style={{ minHeight: 46, background: '#FFD469', border: '3px solid #2A1524', borderRadius: 12, color: '#3E2718', fontFamily: luckiest, fontSize: 14, letterSpacing: '.04em', cursor: 'pointer', boxShadow: '0 4px 0 #2A1524' }}>{v.copyLabel}</button>
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.7, letterSpacing: '.04em', color: '#8E7AAE' }}>TAP A PAD TO DEPLOY · TAP THE CAT TO RECALL IT · DRAG TO PAN · SCROLL OR + − TO ZOOM · F FRAME THE SITE · E EXPAND · ARROWS + ENTER · 1 2 3 CONSULT · R RECALL CREW</div>
          </aside>
        </div>
      </div>
      <div id="cc-flash" style={{ position: 'fixed', inset: 0, background: '#FFE9FF', opacity: 0, pointerEvents: 'none', zIndex: 30 }}></div>
      </>
    );
  }
}
