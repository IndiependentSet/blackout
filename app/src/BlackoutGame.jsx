import { Component } from 'react';
import * as E from './engine.js';

const LIT = '#3fe8ff';
const GRAIN = 0.05;
const SOUND_ON = true;
const DAY_EPOCH = Date.UTC(2026, 3, 15);

export default class BlackoutGame extends Component {
  state = {
    levels: [null, null, null, null, null, null, null],
    idx: 0,
    placed: [],
    results: [null, null, null, null, null, null, null],
    hint: null,
    focus: 0,
    kbd: false,
    msg: '',
    copied: false,
  };

  componentDidMount() {
    document.body.style.setProperty('--grain', String(GRAIN));
    this.onKey = this.onKey.bind(this);
    window.addEventListener('keydown', this.onKey);
    const levels = this.state.levels.slice();
    levels[0] = E.makeLevelForDay(this.seed(), 0);
    this.setState({ levels });
    this.queue(1);
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKey);
    this.hush();
  }

  seed() { return this.day(); }
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

  /* ---- audio ---- */
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
  thunk(n, up) {
    const ac = this.ac(); if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'triangle';
    const base = 58 * Math.pow(1.055, Math.max(0, n - 1));
    o.frequency.setValueAtTime(base * (up ? 2.1 : 1.7), t);
    o.frequency.exponentialRampToValueAtTime(base, t + 0.13);
    f.type = 'lowpass'; f.frequency.setValueAtTime(up ? 1500 : 900, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(up ? 0.16 : 0.09, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (up ? 0.34 : 0.18));
    o.connect(f); f.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.4);
  }
  overload() {
    const ac = this.ac(); if (!ac) return;
    const t = ac.currentTime;
    const buf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ac.createBufferSource(), ng = ac.createGain(), bp = ac.createBiquadFilter();
    src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
    ng.gain.value = 0.14;
    src.connect(bp); bp.connect(ng); ng.connect(ac.destination); src.start(t);
    this.hush();
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.055, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + 6);
    const a = ac.createOscillator(), b = ac.createOscillator();
    a.type = b.type = 'sine'; a.frequency.value = 55; b.frequency.value = 82.4;
    a.connect(g); b.connect(g); g.connect(ac.destination);
    a.start(t); b.start(t); a.stop(t + 6.2); b.stop(t + 6.2);
    this._hum = [a, b];
  }
  hush() { if (this._hum) { try { this._hum.forEach(o => o.stop()); } catch { /* already stopped */ } this._hum = null; } }

  bloom(i) {
    requestAnimationFrame(() => {
      const el = document.getElementById('bloom-' + i);
      if (el && el.animate) el.animate(
        [{ r: 4, opacity: 0.9, strokeWidth: 2 }, { r: 26, opacity: 0, strokeWidth: 0.4 }],
        { duration: 620, easing: 'cubic-bezier(.1,.8,.2,1)' });
    });
  }
  flash() {
    const el = document.getElementById('bo-flash');
    if (el && el.animate) el.animate([{ opacity: 0.82 }, { opacity: 0.82, offset: 0.24 }, { opacity: 0 }],
      { duration: 620, easing: 'ease-out' });
  }

  /* ---- moves ---- */
  tap(i) {
    const lv = this.lv(); if (!lv) return;
    const placed = this.state.placed.slice();
    const at = placed.indexOf(i);
    if (at >= 0) {
      placed.splice(at, 1);
      this.setState({ placed, msg: '', focus: i, hint: this.state.hint === 'reveal' ? null : this.state.hint });
      this.thunk(placed.length + 1, false);
      return;
    }
    if (this.solved()) return;
    if (placed.length >= lv.k + 1) {
      this.setState({ msg: 'BUDGET SPENT — REMOVE ONE', focus: i });
      this.thunk(1, false);
      return;
    }
    placed.push(i);
    const done = this.litSet(lv, placed).size === lv.edges.length;
    const results = this.state.results.slice();
    if (done) results[this.state.idx] = placed.length <= lv.k ? 'perfect' : 'over';
    this.setState({ placed, results, focus: i, hint: null, msg: '', copied: false });
    this.thunk(placed.length, true);
    this.bloom(i);
    if (done) { this.flash(); this.overload(); }
  }
  reset() { this.hush(); this.setState({ placed: [], hint: null, msg: '', focus: 0 }); }
  go(i) {
    if (i < 0 || i > 6 || !this.state.levels[i]) return;
    this.hush();
    this.setState({ idx: i, placed: [], hint: null, msg: '', focus: 0, copied: false });
  }
  next() {
    if (!this.solved()) return;
    if (this.state.idx < 6) this.go(this.state.idx + 1);
  }
  hint(tier) {
    const lv = this.lv(); if (!lv) return;
    const p = new Set(this.state.placed);
    if (tier === 1) {
      const h = E.hintLeaf(lv, p);
      this.setState({
        hint: h ? { kind: 'leaf', leaf: h.leaf, forced: h.forced } : null,
        msg: h ? 'ONE CABLE ONLY — ITS NEIGHBOUR IS FORCED' : 'NO SINGLE-CABLE JUNCTION LEFT',
      });
    } else if (tier === 2) {
      const m = E.hintMatching(lv);
      this.setState({ hint: { kind: 'proof', edges: m }, msg: 'YOU’LL NEED ' + m.length + ' OR MORE' });
    } else {
      const v = E.hintReveal(lv, p);
      this.setState({
        hint: v == null ? null : { kind: 'reveal', node: v },
        msg: v == null ? 'EVERY TRANSFORMER IS ALREADY PLACED' : 'THIS JUNCTION IS IN THE SOLUTION',
      });
    }
  }

  onKey(e) {
    const lv = this.lv(); if (!lv) return;
    const k = e.key;
    if (!this.state.kbd) this.setState({ kbd: true });
    if (k === 'r' || k === 'R') { e.preventDefault(); return this.reset(); }
    if (k === 'n' || k === 'N') { e.preventDefault(); return this.next(); }
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
    if (best >= 0) this.setState({ focus: best });
  }

  layout(lv) {
    const W = 390, HMAX = 420, pad = 40;
    const cs = lv.nodes.map(n => n.c), rs = lv.nodes.map(n => n.r);
    const c0 = Math.min(...cs), c1 = Math.max(...cs), r0 = Math.min(...rs), r1 = Math.max(...rs);
    const cols = Math.max(1, c1 - c0), rows = Math.max(1, r1 - r0);
    const sp = Math.min((W - 2 * pad) / cols, (HMAX - 2 * pad) / rows, 84);
    const H = Math.max(200, Math.min(HMAX, rows * sp + 2 * pad));
    const ox = (W - cols * sp) / 2 - c0 * sp, oy = (H - rows * sp) / 2 - r0 * sp;
    return { H, box: '0 0 ' + W + ' ' + H, pos: lv.nodes.map(n => ({ x: ox + n.c * sp, y: oy + n.r * sp })) };
  }

  share() {
    const r = this.state.results;
    const glyphs = r.map(x => (x === 'perfect' ? '⚡' : '⬜')).join('');
    const n = r.filter(x => x === 'perfect').length;
    return 'BLACKOUT #' + this.day() + '\n' + glyphs + '  ' + n + '/7 perfect';
  }
  copyShare() {
    const t = this.share();
    const done = () => { this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else done();
  }

  /* ---- derived render values, mirrors the design's renderVals() ---- */
  renderVals() {
    const lv = this.lv(), st = this.state, hint = st.hint;
    const day = this.day();
    const vals = {
      day, stars: lv ? '★'.repeat(lv.stars) : '', box: '0 0 390 300', boxW: 390, boxH: 300,
      edges: [], nodes: [], proof: [], used: st.placed.length, par: lv ? lv.k : 0,
      litCount: 0, edgeCount: lv ? lv.edges.length : 0,
      usedColor: '#cdd8ea', msg: st.msg || (lv ? '' : 'ENERGISING GRID…'), msgColor: '#6f7899',
      pickAt: null,
      hints: [1, 2, 3].map(t => ({
        tier: t, label: ['FORCED', 'PROOF', 'REVEAL'][t - 1],
        border: hint && ((t === 1 && hint.kind === 'leaf') || (t === 2 && hint.kind === 'proof') || (t === 3 && hint.kind === 'reveal')) ? LIT : '#1c2342',
        color: hint && ((t === 1 && hint.kind === 'leaf') || (t === 2 && hint.kind === 'proof') || (t === 3 && hint.kind === 'reveal')) ? LIT : '#8a94b4',
      })),
      pips: [0, 1, 2, 3, 4, 5, 6].map(i => ({
        i, h: i === st.idx ? 3 : 1,
        fill: i === st.idx ? LIT : st.results[i] === 'perfect' ? '#3a5f7a'
          : st.results[i] === 'over' ? '#6b5330' : this.state.levels[i] ? '#1c2342' : '#101528',
      })),
      showShare: st.results.filter(Boolean).length === 7,
      shareText: this.share(), copyLabel: st.copied ? 'COPIED' : 'COPY GRID LOG',
      banner: '', bannerColor: '#4d5677', bannerBorder: '#1c2342',
      nextLabel: 'NEXT', nextBg: '#1c2342', nextO: 0.35,
    };
    vals.msgColor = st.msg && st.msg.indexOf('MORE') > 0 ? '#ffb454' : '#6f7899';
    if (!lv) return vals;

    const L = this.layout(lv), pos = L.pos, pset = new Set(st.placed);
    vals.box = L.box; vals.boxH = L.H; vals.boxW = 390;
    this._pos = pos;
    vals.pickAt = ev => {
      const svg = ev.currentTarget.ownerSVGElement || ev.currentTarget;
      const m = svg.getScreenCTM(); if (!m) return;
      const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
      const q = p.matrixTransform(m.inverse());
      let best = -1, bd = Infinity;
      this._pos.forEach((n, i) => { const d = Math.hypot(n.x - q.x, n.y - q.y); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && bd <= 26) this.tap(best);
    };
    const litE = this.litSet(lv, st.placed);
    vals.litCount = litE.size;
    vals.usedColor = st.placed.length > lv.k ? '#ffb454' : st.placed.length === lv.k ? LIT : '#cdd8ea';

    vals.edges = lv.edges.map(([u, v], i) => {
      const on = litE.has(i);
      const ou = pset.has(u) ? st.placed.indexOf(u) : -1, ov = pset.has(v) ? st.placed.indexOf(v) : -1;
      const flip = ov > ou;
      const A = pos[flip ? v : u], B = pos[flip ? u : v];
      const len = Math.round(Math.hypot(B.x - A.x, B.y - A.y) * 10) / 10;
      return { key: i, x1: A.x, y1: A.y, x2: B.x, y2: B.y, dash: len + ' ' + len, off: on ? 0 : len };
    });

    if (hint && hint.kind === 'proof')
      vals.proof = hint.edges.map(i => {
        const [u, v] = lv.edges[i];
        return { key: i, x1: pos[u].x, y1: pos[u].y, x2: pos[v].x, y2: pos[v].y };
      });

    const solvedNow = litE.size === lv.edges.length;
    vals.nodes = lv.nodes.map((_, i) => {
      const on = pset.has(i);
      const pulsing = hint && hint.kind === 'leaf' && (i === hint.leaf || i === hint.forced);
      const revealed = hint && hint.kind === 'reveal' && i === hint.node;
      return {
        i, x: pos[i].x, y: pos[i].y,
        r: on ? 4.8 : 3.2, fill: on ? LIT : '#080b18', stroke: on ? LIT : '#2c3568',
        ringO: on ? 0.4 : 0, pulseR: revealed ? 11 : 9, pulseO: pulsing || revealed ? 1 : 0,
        anim: pulsing ? 'bo-pulse 1.15s ease-in-out infinite' : 'none',
        focusO: st.kbd && i === st.focus ? 0.5 : 0, focusX: pos[i].x - 12, focusY: pos[i].y - 12,
      };
    });

    if (solvedNow) {
      const perfect = st.placed.length <= lv.k;
      vals.banner = perfect ? 'PERFECT ' + lv.k + '/' + lv.k : 'OVER ' + st.placed.length + '/' + lv.k;
      vals.bannerColor = perfect ? LIT : '#ffb454';
      vals.bannerBorder = perfect ? LIT : '#4a3a1c';
      vals.nextBg = perfect ? LIT : '#ffb454';
      vals.nextO = st.idx < 6 ? 1 : 0.35;
      vals.nextLabel = st.idx < 6 ? 'NEXT' : 'DONE';
    } else {
      vals.banner = 'GRID ' + (st.idx + 1) + '/7 · PAR ' + lv.k;
    }
    return vals;
  }

  render() {
    const v = this.renderVals();
    return (
      <div style={{ minHeight: '100vh', background: '#05060a', color: '#9aa6c4', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 430, padding: '16px 14px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.34em', color: '#e6eef7' }}>BLACKOUT</span>
              <span style={{ fontSize: 11, letterSpacing: '0.14em', color: '#4d5677' }}>#{v.day}</span>
            </div>
            <span style={{ fontSize: 12, letterSpacing: '0.18em', color: LIT }}>{v.stars}</span>
          </div>

          <div style={{ display: 'flex', gap: 0, alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #12172e', borderBottom: '1px solid #12172e' }}>
            {v.pips.map(p => (
              <button key={p.i} type="button" onClick={() => this.go(p.i)} aria-label={'grid ' + (p.i + 1)}
                style={{ flex: 1, height: 44, background: 'none', border: 0, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ display: 'block', width: '100%', margin: '0 3px', height: p.h, background: p.fill }}></span>
              </button>
            ))}
          </div>

          <svg viewBox={v.box} width="100%" role="application" tabIndex={0} aria-label="power grid" style={{ display: 'block', touchAction: 'manipulation', outline: 'none' }}>
            {v.edges.map(e => (
              <g key={e.key}>
                <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#171d42" strokeWidth={1.5} />
                <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={LIT} strokeWidth={7} strokeOpacity={0.13}
                  strokeDasharray={e.dash} strokeDashoffset={e.off} style={{ transition: 'stroke-dashoffset 420ms cubic-bezier(.15,.85,.25,1)' }} />
                <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={LIT} strokeWidth={1.7}
                  strokeDasharray={e.dash} strokeDashoffset={e.off} style={{ transition: 'stroke-dashoffset 340ms cubic-bezier(.15,.85,.25,1)' }} />
              </g>
            ))}
            {v.proof.map(m => (
              <line key={m.key} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#ffb454" strokeWidth={3} strokeOpacity={0.85}
                strokeDasharray="7 5" style={{ animation: 'bo-dash 900ms linear infinite' }} />
            ))}
            {v.nodes.map(n => (
              <g key={n.i}>
                <circle cx={n.x} cy={n.y} r={n.pulseR} fill="none" stroke={LIT} strokeWidth={1} opacity={n.pulseO} style={{ animation: n.anim }} />
                <circle id={'bloom-' + n.i} cx={n.x} cy={n.y} r={6} fill="none" stroke={LIT} strokeWidth={1.4} opacity={0} />
                <circle cx={n.x} cy={n.y} r={9} fill="none" stroke={LIT} strokeWidth={1} opacity={n.ringO} />
                <circle cx={n.x} cy={n.y} r={n.r} fill={n.fill} stroke={n.stroke} strokeWidth={1.2} />
                <rect x={n.focusX} y={n.focusY} width={24} height={24} fill="none" stroke="#e6eef7" strokeWidth={1} strokeDasharray="4 4" opacity={n.focusO} />
              </g>
            ))}
            <rect x={0} y={0} width={v.boxW} height={v.boxH} fill="transparent" onClick={v.pickAt || undefined} style={{ cursor: 'pointer' }} />
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12.5, letterSpacing: '0.06em', color: '#9aa6c4' }}>
              <span style={{ color: v.usedColor, fontWeight: 600 }}>{v.used} / {v.par}</span> transformers · <span style={{ color: '#cdd8ea' }}>{v.litCount}</span> of {v.edgeCount} cables lit
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', minHeight: 15, color: v.msgColor }}>{v.msg}</div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {v.hints.map(h => (
              <button key={h.tier} type="button" onClick={() => this.hint(h.tier)}
                style={{ flex: 1, minHeight: 44, background: 'none', border: '1px solid ' + h.border, color: h.color, fontSize: 10.5, letterSpacing: '0.14em', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span style={{ opacity: .5, fontSize: 9 }}>{h.tier}</span>
                <span>{h.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
            <button type="button" onClick={() => this.reset()}
              style={{ minHeight: 44, padding: '0 16px', background: 'none', border: '1px solid #1c2342', color: '#6f7899', fontSize: 10.5, letterSpacing: '0.16em', cursor: 'pointer' }}>CLEAR</button>
            <div style={{ flex: 1, minHeight: 44, border: '1px solid ' + v.bannerBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 0 14px', gap: 8 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.14em', whiteSpace: 'nowrap', color: v.bannerColor }}>{v.banner}</span>
              <button type="button" onClick={() => this.next()}
                style={{ height: 36, padding: '0 14px', background: v.nextBg, border: 0, color: '#05060a', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', cursor: 'pointer', opacity: v.nextO }}>{v.nextLabel}</button>
            </div>
          </div>

          {v.showShare && (
            <div style={{ border: '1px solid #1c2342', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#4d5677' }}>GRID LOG</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: '#cdd8ea', whiteSpace: 'pre-wrap' }}>{v.shareText}</div>
              <button type="button" onClick={() => this.copyShare()}
                style={{ minHeight: 44, background: 'none', border: '1px solid ' + LIT, color: LIT, fontSize: 10.5, letterSpacing: '0.16em', cursor: 'pointer' }}>{v.copyLabel}</button>
            </div>
          )}

          <div style={{ fontSize: 9.5, lineHeight: 1.9, letterSpacing: '0.1em', color: '#363e5c' }}>TAP A JUNCTION TO INSTALL · TAP AGAIN TO REMOVE · ARROWS + ENTER · 1 2 3 HINTS · R CLEAR</div>
        </div>
        <div id="bo-flash" style={{ position: 'fixed', inset: 0, background: '#ffffff', opacity: 0, pointerEvents: 'none', zIndex: 30 }}></div>
      </div>
    );
  }
}
