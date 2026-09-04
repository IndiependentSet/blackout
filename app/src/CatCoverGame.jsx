import { Component } from 'react';
import * as E from './engine.js';
import { BREEDS, CAT_BASELINE } from './assets/cats/index.js';

const SOUND_ON = true;
const CABLE_SAG = 0.1;
const DAY_EPOCH = Date.UTC(2026, 3, 15);

/* how big a sticker cat is drawn, and where its feet land, in node units */
const CAT_D = 56;
const CAT_FOOT = 18;
const CAT_TOP = CAT_FOOT - CAT_D * CAT_BASELINE;

export default class CatCoverGame extends Component {
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
    this.onKey = this.onKey.bind(this);
    window.addEventListener('keydown', this.onKey);
    const levels = this.state.levels.slice();
    levels[0] = E.makeLevelForDay(this.seed(), 0);
    this.setState({ levels });
    this.queue(1);
  }
  componentWillUnmount() { window.removeEventListener('keydown', this.onKey); }

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
      this.setState({ msg: 'TOO MANY CATS — YOU WASTED FUR', focus: i });
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
  }
  next() { if (this.solved() && this.state.idx < 6) this.go(this.state.idx + 1); }
  hint(tier) {
    const lv = this.lv(); if (!lv) return;
    const p = new Set(this.state.placed);
    if (tier === 1) {
      const h = E.hintLeaf(lv, p);
      this.setState({
        hint: h ? { kind: 'leaf', leaf: h.leaf, forced: h.forced } : null,
        msg: h ? 'ONE THING ONLY — ITS NEIGHBOUR MUST GO' : 'NO ONE-THING CAT LEFT',
      });
    } else if (tier === 2) {
      const m = E.hintMatching(lv);
      this.setState({ hint: { kind: 'proof', edges: m }, msg: 'YOU’LL NEED ' + m.length + ' CATS OR MORE' });
    } else {
      const v = E.hintReveal(lv, p);
      this.setState({
        hint: v == null ? null : { kind: 'reveal', node: v },
        msg: v == null ? 'EVERY CULPRIT IS ALREADY OUT' : 'THIS CAT IS IN THE ANSWER',
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
    const W = 560, HMAX = 610, pad = 60;
    const cs = lv.nodes.map(n => n.c), rs = lv.nodes.map(n => n.r);
    const c0 = Math.min(...cs), c1 = Math.max(...cs), r0 = Math.min(...rs), r1 = Math.max(...rs);
    const cols = Math.max(1, c1 - c0), rows = Math.max(1, r1 - r0);
    const sp = Math.min((W - 2 * pad) / cols, (HMAX - 2 * pad) / rows, 150);
    const H = Math.max(300, Math.min(HMAX, rows * sp + 2 * pad));
    const ox = (W - cols * sp) / 2 - c0 * sp, oy = (H - rows * sp) / 2 - r0 * sp;
    return { W, H, sp, box: '0 0 ' + W + ' ' + H, pos: lv.nodes.map(n => ({ x: ox + n.c * sp, y: oy + n.r * sp })) };
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
    return 'CAT COVER #' + this.day() + '\n' + glyphs + '  ' + n + '/7 purr-fect';
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
      plaque: lv ? 'KNOCK IT ALL OVER!' : 'WAKING THE CATS…',
      box: '0 0 420 300', boxW: 420, boxH: 300,
      edges: [], things: [], nodes: [], proof: [],
      used: st.placed.length, par: lv ? lv.k : 0, litCount: 0, edgeCount: lv ? lv.edges.length : 0,
      usedColor: '#FFF3D8', msg: st.msg, msgColor: '#C9B8E0',
      steps: [
        { n: 1, head: 'CATS CAUSE CHAOS.', body: 'Each cat knocks over everything it is connected to.' },
        { n: 2, head: 'COVER EVERY PATH.', body: 'Put a cat on at least one end of every path.' },
        { n: 3, head: 'USE AS FEW AS POSSIBLE.', body: 'Match par and the chaos is purr-fect.' },
      ],
      overLabel: lv ? (lv.k + 1) + ' CATS USED' : '—',
      parLabel: lv ? lv.k + ' CATS USED' : '—',
      hints: [1, 2, 3].map(t => ({
        tier: t, label: ['FORCED', 'PROOF', 'REVEAL'][t - 1],
        bg: active(t) ? '#FFD469' : '#F4E4C4', ink: '#3E2718',
      })),
      pips: [0, 1, 2, 3, 4, 5, 6].map(i => ({
        i, n: i + 1,
        lift: i === st.idx ? 0 : 4, dy: i === st.idx ? 4 : 0,
        ink: st.results[i] || i === st.idx ? '#2A1524' : '#C9B8E0',
        fill: i === st.idx ? '#FFD469' : st.results[i] === 'perfect' ? '#C877D8'
          : st.results[i] === 'over' ? '#E8A34A' : this.state.levels[i] ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)',
      })),
      showShare: st.results.filter(Boolean).length === 7,
      shareText: this.share(), copyLabel: st.copied ? 'COPIED!' : 'COPY REPORT',
      banner: '', bannerBg: 'rgba(255,255,255,.08)', bannerInk: '#F4E4C4',
      nextBg: 'rgba(255,255,255,.22)', nextLabel: 'NEXT', nextO: 0.45,
    };
    vals.msgColor = st.msg && st.msg.indexOf('TOO MANY') === 0 ? '#FF8FA8' : '#FFD469';
    if (!lv) return vals;

    const L = this.layout(lv), pos = L.pos, pset = new Set(st.placed);
    vals.box = L.box; vals.boxW = L.W; vals.boxH = L.H;
    /* the sticker cats stand above their node point, so keep the tap target generous */
    this._pos = pos; this._hit = Math.max(26, L.sp * 0.46);
    vals.pickAt = ev => {
      const svg = ev.currentTarget.ownerSVGElement || ev.currentTarget;
      const m = svg.getScreenCTM(); if (!m) return;
      const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
      const q = p.matrixTransform(m.inverse());
      let best = -1, bd = Infinity;
      this._pos.forEach((n, i) => { const d = Math.hypot(n.x - q.x, n.y - q.y); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && bd <= this._hit) this.tap(best);
    };

    const litE = this.litSet(lv, st.placed);
    vals.litCount = litE.size;
    vals.usedColor = st.placed.length > lv.k ? '#FF8FA8' : st.placed.length === lv.k ? '#8CE8B0' : '#FFF3D8';

    const catS = Math.max(0.6, Math.min(1.4, L.sp / 110));
    const objS = Math.max(0.8, Math.min(1.5, L.sp / 95));

    lv.edges.forEach(([u, v], i) => {
      const on = litE.has(i);
      const ou = pset.has(u) ? st.placed.indexOf(u) : -1, ov = pset.has(v) ? st.placed.indexOf(v) : -1;
      const flip = ov > ou;
      const A = pos[flip ? v : u], B = pos[flip ? u : v];
      const c = this.cable(A, B);
      vals.edges.push({
        key: i, d: c.d, off: on ? 0 : 1, on,
        w1: +(15 * catS).toFixed(1), w2: +(6 * catS).toFixed(1), w3: +(26 * catS).toFixed(1),
        w4: +(13 * catS).toFixed(1), w5: +(4.4 * catS).toFixed(1),
        dash: (11 * catS).toFixed(1) + ' ' + (11 * catS).toFixed(1),
        flow: (5 * catS).toFixed(1) + ' ' + (16 * catS).toFixed(1),
      });
      const kind = (u * 7 + v * 3 + i) % 5;
      vals.things.push({
        key: i, x: c.mx, y: c.my, s: objS, rot: on ? (i % 2 ? 74 : -74) : 0, dustO: on ? 1 : 0,
        k0: kind === 0, k1: kind === 1, k2: kind === 2, k3: kind === 3, k4: kind === 4,
      });
    });

    if (hint && hint.kind === 'proof')
      vals.proof = hint.edges.map(i => {
        const [u, v] = lv.edges[i];
        return { key: i, d: this.cable(pos[u], pos[v]).d };
      });

    vals.nodes = lv.nodes.map((_, i) => {
      const on = pset.has(i);
      /* 5 is coprime with the breed count, so neighbouring cats differ; the
         level index shifts the whole cast so each house has its own line-up */
      const b = BREEDS[(i * 5 + st.idx * 2) % BREEDS.length];
      const pulsing = hint && hint.kind === 'leaf' && (i === hint.leaf || i === hint.forced);
      const revealed = hint && hint.kind === 'reveal' && i === hint.node;
      return {
        i, x: pos[i].x, y: pos[i].y, s: catS,
        name: b.name, sleep: b.sleep, wakeA: b.wakeA, wakeB: b.wakeB,
        on: on ? 1 : 0, awake: on ? 1 : 0, asleep: on ? 0 : 1,
        haloO: on ? 0.2 : 0, ringO: on ? 1 : 0,
        glow: on ? 'cc-glow 1.8s ease-in-out infinite' : 'none',
        /* dozing cats breathe; woken cats hop between their two poses */
        bob: on ? 'cc-pounce .7s ease-in-out infinite' : 'cc-snooze 3.4s ease-in-out infinite',
        frameA: on ? 'cc-frame-a .7s steps(1, end) infinite' : 'none',
        frameB: on ? 'cc-frame-b .7s steps(1, end) infinite' : 'none',
        pulseR: 26, pulseO: pulsing || revealed ? 1 : 0,
        anim: pulsing || revealed ? 'cc-pulse 1.15s ease-in-out infinite' : 'none',
        focusO: st.kbd && i === st.focus ? 0.9 : 0,
      };
    });

    if (litE.size === lv.edges.length) {
      const perfect = st.placed.length <= lv.k;
      vals.banner = perfect ? 'PURR-FECT CHAOS! ' + lv.k + '/' + lv.k : 'GOOD — BUT ' + st.placed.length + '/' + lv.k;
      vals.bannerBg = perfect ? '#C877D8' : '#E8A34A';
      vals.bannerInk = '#2A1524';
      vals.nextBg = '#F4E4C4';
      vals.nextO = st.idx < 6 ? 1 : 0.45;
      vals.nextLabel = st.idx < 6 ? 'NEXT HOUSE' : 'ALL DONE';
    } else {
      vals.banner = 'HOUSE ' + (st.idx + 1) + '/7 · PAR ' + lv.k + ' CATS';
      if (!st.msg && st.placed.length && st.placed.length >= lv.k) vals.msg = 'SOMETHING SURVIVED…';
    }
    return vals;
  }

  render() {
    const v = this.renderVals();
    const luckiest = "'Luckiest Guy', cursive";
    return (
      <>
      <div style={{ minHeight: '100vh', background: 'radial-gradient(120% 90% at 50% 0%, #2A1B3D 0%, #170F22 55%, #100A18 100%)', color: '#F4E4C4', padding: '18px 14px 30px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>

          <aside style={{ flex: '1 1 250px', minWidth: 250, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.84, paddingTop: 2 }}>
              <span style={{ fontFamily: luckiest, fontSize: 58, letterSpacing: '.01em', color: '#F7B32B', WebkitTextStroke: '7px #2A1524', paintOrder: 'stroke fill', textShadow: '0 6px 0 #2A1524' }}>CAT</span>
              <span style={{ fontFamily: luckiest, fontSize: 46, letterSpacing: '.02em', color: '#EADDF7', WebkitTextStroke: '7px #2A1524', paintOrder: 'stroke fill', textShadow: '0 6px 0 #2A1524' }}>COVER</span>
            </div>

            <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 14px 6px 16px', boxShadow: '0 5px 0 #2A1524, inset 0 0 26px rgba(150,110,60,.25)', padding: '13px 15px', transform: 'rotate(-1.2deg)' }}>
              <div style={{ fontFamily: luckiest, fontSize: 19, lineHeight: 1.22, color: '#3E2718', textWrap: 'pretty' }}>SELECT THE LEAST NUMBER OF CATS REQUIRED TO <span style={{ color: '#8A3FC0' }}>RUIN THE HOUSE.</span></div>
            </div>

            <div style={{ background: 'linear-gradient(#FFF7E6, #F2E3C2)', border: '3px solid #2A1524', borderRadius: '16px 16px 16px 4px', boxShadow: '0 5px 0 #2A1524', padding: '12px 14px', fontSize: 14, fontWeight: 700, lineHeight: 1.45, color: '#4A3120' }}>
              These cats are connected by destructive paths. Put a cat on one end of each path and <span style={{ color: '#8A3FC0', fontWeight: 900 }}>EVERYTHING</span> falls!
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ alignSelf: 'flex-start', background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: 8, boxShadow: '0 4px 0 #2A1524', padding: '4px 14px', fontFamily: luckiest, fontSize: 14, letterSpacing: '.06em', color: '#FFD469' }}>HOUSES</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {v.pips.map(p => (
                  <button key={p.i} type="button" onClick={() => this.go(p.i)} aria-label={'house ' + (p.i + 1)}
                    style={{ flex: 1, minHeight: 40, background: p.fill, border: '3px solid #2A1524', borderRadius: 10, padding: 0, cursor: 'pointer', color: p.ink, fontFamily: luckiest, fontSize: 15, boxShadow: '0 ' + p.lift + 'px 0 #2A1524', transform: 'translateY(' + p.dy + 'px)' }}>{p.n}</button>
                ))}
              </div>
            </div>
          </aside>

          <main style={{ flex: '5 1 460px', minWidth: 300, maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <div style={{ background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: 10, boxShadow: '0 4px 0 #2A1524', padding: '3px 22px', fontFamily: luckiest, fontSize: 17, letterSpacing: '.05em', color: '#FFD469', position: 'relative', zIndex: 2 }}>HOUSE {v.levelNo} <span style={{ color: '#F06BFF' }}>{v.stars}</span></div>
              <div style={{ marginTop: -6, width: '92%', background: 'linear-gradient(#F6E8CA, #E8D3A6)', border: '3px solid #2A1524', borderRadius: '3px 3px 10px 10px', boxShadow: '0 5px 0 #2A1524', padding: '9px 12px 6px', textAlign: 'center', fontFamily: luckiest, fontSize: 20, letterSpacing: '.02em', color: '#3E2718' }}>{v.plaque}</div>
            </div>

            <div style={{ background: 'repeating-linear-gradient(96deg, #6B4730 0 46px, #664129 46px 48px, #6E4A32 48px 94px, #5E3B25 94px 96px)', border: '6px solid #34200F', borderRadius: 18, boxShadow: '0 8px 0 #1E1208, inset 0 0 70px rgba(0,0,0,.55)', padding: 6, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 6, borderRadius: 12, pointerEvents: 'none', boxShadow: 'inset 0 0 60px rgba(0,0,0,.5)' }}></div>
              <svg viewBox={v.box} width="100%" role="application" tabIndex={0} aria-label="cat cover grid" style={{ display: 'block', touchAction: 'manipulation', outline: 'none', borderRadius: 12 }}>
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

                {v.things.map(o => (
                  <g key={o.key} transform={'translate(' + o.x + ' ' + o.y + ') scale(' + o.s + ')'}>
                    <ellipse cx={0} cy={11} rx={13} ry={4} fill="#000000" opacity={.28} />
                    <g transform={'rotate(' + o.rot + ' 0 10)'} style={{ transition: 'transform 420ms cubic-bezier(.2,1.5,.4,1)' }}>
                      {o.k0 && (
                        <>
                          <path d="M -7 -2 Q -12 -12 -3 -13 Q -1 -20 3 -13 Q 12 -12 6 -2 Z" fill="#5FBB63" stroke="#2A1524" strokeWidth={2} strokeLinejoin="round" />
                          <path d="M -8 -1 L 8 -1 L 6 10 L -6 10 Z" fill="#D2703F" stroke="#2A1524" strokeWidth={2.2} strokeLinejoin="round" />
                          <path d="M -8.6 -1 L 8.6 -1" stroke="#2A1524" strokeWidth={2.2} strokeLinecap="round" />
                        </>
                      )}
                      {o.k1 && (
                        <>
                          <path d="M -3.4 -13 L 3.4 -13 L 3.4 -9 Q 9 -4 8 3 Q 7 10 0 10 Q -7 10 -8 3 Q -9 -4 -3.4 -9 Z" fill="#6FA8DC" stroke="#2A1524" strokeWidth={2.2} strokeLinejoin="round" />
                          <path d="M -3.6 0 Q -1 3 -3.4 6" fill="none" stroke="#DFF0FF" strokeWidth={2} strokeLinecap="round" opacity={.8} />
                        </>
                      )}
                      {o.k2 && (
                        <>
                          <path d="M 6 -5 Q 13 -5 13 0 Q 13 5 6 5" fill="none" stroke="#2A1524" strokeWidth={4.4} strokeLinecap="round" />
                          <path d="M -8 -8 L 8 -8 L 6.4 10 L -6.4 10 Z" fill="#F6F1E7" stroke="#2A1524" strokeWidth={2.2} strokeLinejoin="round" />
                          <path d="M -7.2 -4.4 L 7.2 -4.4" stroke="#C64BE8" strokeWidth={2.6} strokeLinecap="round" />
                        </>
                      )}
                      {o.k3 && (
                        <>
                          <circle cx={0} cy={0} r={11} fill="#7FD3F0" fillOpacity={.55} stroke="#2A1524" strokeWidth={2.2} />
                          <path d="M -9.6 2 Q 0 6 9.6 2 L 9.6 4 Q 0 8 -9.6 4 Z" fill="#3FA8D8" opacity={.7} />
                          <path d="M -3 -1 L 2 -3.4 L 2 1.4 Z" fill="#F08C3A" stroke="#2A1524" strokeWidth={1.2} strokeLinejoin="round" />
                          <path d="M 2 -1 L 5.4 -3.6 L 5.4 1.6 Z" fill="#F08C3A" stroke="#2A1524" strokeWidth={1.2} strokeLinejoin="round" />
                        </>
                      )}
                      {o.k4 && (
                        <>
                          <path d="M -9 -3 L -5 -13 L 5 -13 L 9 -3 Z" fill="#F3C969" stroke="#2A1524" strokeWidth={2.2} strokeLinejoin="round" />
                          <path d="M 0 -3 L 0 7" stroke="#2A1524" strokeWidth={2.6} strokeLinecap="round" />
                          <path d="M -6 10 L 6 10 Q 7 7 0 7 Q -7 7 -6 10 Z" fill="#8B5E3C" stroke="#2A1524" strokeWidth={2} strokeLinejoin="round" />
                        </>
                      )}
                    </g>
                    <g opacity={o.dustO}>
                      <circle cx={-11} cy={6} r={2.6} fill="#FFE9C4" style={{ animation: 'cc-dust 1.4s ease-out infinite' }} />
                      <circle cx={10} cy={4} r={2.2} fill="#FFE9C4" style={{ animation: 'cc-dust 1.4s .5s ease-out infinite' }} />
                      <path d="M 0 -16 l 2 4 l 4 1 l -4 1.6 l -2 4 l -2 -4 l -4 -1.6 l 4 -1 Z" fill="#FFEFAF" style={{ animation: 'cc-spark 1.1s ease-in-out infinite' }} />
                    </g>
                  </g>
                ))}

                {v.nodes.map(n => (
                  <g key={n.i} transform={'translate(' + n.x + ' ' + n.y + ') scale(' + n.s + ')'}>
                    <circle cx={0} cy={-8} r={n.pulseR} fill="none" stroke="#FFD469" strokeWidth={3} opacity={n.pulseO} style={{ animation: n.anim }} />
                    <ellipse cx={0} cy={18} rx={19} ry={5.5} fill="#000000" opacity={.33} />
                    <circle cx={0} cy={-2} r={27} fill="#F06BFF" opacity={n.haloO} style={{ animation: n.glow }} />
                    <ellipse cx={0} cy={17} rx={22} ry={7} fill="none" stroke="#F06BFF" strokeWidth={3.5} opacity={n.ringO} />
                    <circle id={'cc-bloom-' + n.i} cx={0} cy={0} r={8} fill="none" stroke="#FFEFFF" strokeWidth={3} opacity={0} />
                    <g style={{ animation: n.bob, transformOrigin: '0px ' + CAT_FOOT + 'px' }}>
                      <image href={n.sleep} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={n.asleep}
                        style={{ transition: 'opacity 160ms ease-out' }}>
                        <title>{n.name} — dozing</title>
                      </image>
                      <image href={n.wakeA} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0} style={{ animation: n.frameA }}>
                        <title>{n.name} — on the loose</title>
                      </image>
                      <image href={n.wakeB} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0} style={{ animation: n.frameB }} />
                    </g>
                    <g opacity={n.asleep} style={{ transition: 'opacity 160ms ease-out' }}>
                      <text x={11} y={-13} fontFamily="'Luckiest Guy', cursive" fontSize={8} fill="#9ED2FF" stroke="#1B2A4A" strokeWidth={.9} paintOrder="stroke fill" style={{ animation: 'cc-zzz 3.3s ease-out infinite' }}>z</text>
                      <text x={15} y={-19} fontFamily="'Luckiest Guy', cursive" fontSize={10} fill="#9ED2FF" stroke="#1B2A4A" strokeWidth={.9} paintOrder="stroke fill" style={{ animation: 'cc-zzz 3.3s 1.1s ease-out infinite' }}>z</text>
                      <text x={19} y={-26} fontFamily="'Luckiest Guy', cursive" fontSize={12} fill="#9ED2FF" stroke="#1B2A4A" strokeWidth={.9} paintOrder="stroke fill" style={{ animation: 'cc-zzz 3.3s 2.2s ease-out infinite' }}>z</text>
                    </g>
                    <g opacity={n.on}>
                      <path d="M -26 -18 l 3.6 1.4 l 1.4 3.6 l 1.4 -3.6 l 3.6 -1.4 l -3.6 -1.4 l -1.4 -3.6 l -1.4 3.6 Z" fill="#FFD469" style={{ animation: 'cc-spark 1.2s ease-in-out infinite' }} />
                      <path d="M 19 -30 l 3 1.2 l 1.2 3 l 1.2 -3 l 3 -1.2 l -3 -1.2 l -1.2 -3 l -1.2 3 Z" fill="#F06BFF" style={{ animation: 'cc-spark 1.5s .3s ease-in-out infinite' }} />
                    </g>
                    <rect x={-29} y={-34} width={58} height={56} rx={15} fill="none" stroke="#FFD469" strokeWidth={3} strokeDasharray="7 6" opacity={n.focusO} />
                  </g>
                ))}
                <rect x={0} y={0} width={v.boxW} height={v.boxH} fill="transparent" onClick={v.pickAt} style={{ cursor: 'pointer' }} />
              </svg>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: '1 1 190px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.06)', border: '3px solid #2A1524', borderRadius: 13, padding: '8px 13px' }}>
                <span style={{ fontFamily: luckiest, fontSize: 22, color: v.usedColor }}>{v.used}/{v.par}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#C9B8E0' }}>cats</span>
                <span style={{ marginLeft: 'auto', fontFamily: luckiest, fontSize: 22, color: '#F06BFF' }}>{v.litCount}/{v.edgeCount}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#C9B8E0' }}>smashed</span>
              </div>
              <div style={{ flex: '1 1 170px', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right', fontSize: 13, fontWeight: 900, letterSpacing: '.02em', color: v.msgColor }}>{v.msg}</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {v.hints.map(h => (
                <button key={h.tier} type="button" onClick={() => this.hint(h.tier)}
                  style={{ flex: 1, minHeight: 52, background: h.bg, border: '3px solid #2A1524', borderRadius: 13, color: h.ink, fontSize: 13, fontWeight: 900, letterSpacing: '.04em', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 #2A1524' }}>
                  <span style={{ opacity: .6, fontSize: 9, fontWeight: 800, letterSpacing: '.12em' }}>HINT {h.tier}</span>
                  <span>{h.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <button type="button" onClick={() => this.reset()}
                style={{ minHeight: 56, padding: '0 18px', background: '#F4E4C4', border: '3px solid #2A1524', borderRadius: 14, color: '#3E2718', fontFamily: luckiest, fontSize: 15, letterSpacing: '.04em', cursor: 'pointer', boxShadow: '0 4px 0 #2A1524' }}>TIDY UP</button>
              <div style={{ flex: 1, minHeight: 56, background: v.bannerBg, border: '3px solid #2A1524', borderRadius: 14, boxShadow: '0 4px 0 #2A1524', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 7px 0 15px', gap: 8 }}>
                <span style={{ fontFamily: luckiest, fontSize: 15, letterSpacing: '.02em', color: v.bannerInk }}>{v.banner}</span>
                <button type="button" onClick={() => this.next()}
                  style={{ height: 42, padding: '0 18px', background: v.nextBg, border: '3px solid #2A1524', borderRadius: 11, color: '#3E2718', fontFamily: luckiest, fontSize: 14, letterSpacing: '.04em', cursor: 'pointer', opacity: v.nextO }}>{v.nextLabel}</button>
              </div>
            </div>
          </main>

          <aside style={{ flex: '1 1 250px', minWidth: 250, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ alignSelf: 'center', background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: 9, boxShadow: '0 4px 0 #2A1524', padding: '4px 18px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.05em', color: '#FFD469', position: 'relative', zIndex: 2 }}>HOW IT WORKS</div>
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

            <div style={{ alignSelf: 'center', background: '#C877D8', border: '3px solid #2A1524', borderRadius: 9, boxShadow: '0 4px 0 #2A1524', padding: '4px 18px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.05em', color: '#3E1B4A', position: 'relative', zIndex: 2 }}>SCORING</div>
            <div style={{ marginTop: -20, background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: 14, boxShadow: '0 5px 0 #2A1524', padding: '22px 12px 12px', display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, padding: '9px 10px' }}>
                <div style={{ fontFamily: luckiest, fontSize: 13, color: '#3E2718' }}>{v.overLabel}</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#7A5638', lineHeight: 1.3 }}>GOOD, BUT YOU CAN DO BETTER!</div>
              </div>
              <div style={{ flex: 1, background: '#EBD4F5', border: '2.5px solid #2A1524', borderRadius: 10, padding: '9px 10px' }}>
                <div style={{ fontFamily: luckiest, fontSize: 13, color: '#3E1B4A' }}>{v.parLabel}</div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#6E3FA3', lineHeight: 1.3 }}>PURR-FECT CHAOS!</div>
              </div>
            </div>

            {v.showShare && (
              <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: 14, boxShadow: '0 5px 0 #2A1524', padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ fontFamily: luckiest, fontSize: 13, letterSpacing: '.08em', color: '#8A3FC0' }}>DAMAGE REPORT</div>
                <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.55, color: '#3E2718', whiteSpace: 'pre-wrap' }}>{v.shareText}</div>
                <button type="button" onClick={() => this.copyShare()}
                  style={{ minHeight: 46, background: '#FFD469', border: '3px solid #2A1524', borderRadius: 12, color: '#3E2718', fontFamily: luckiest, fontSize: 14, letterSpacing: '.04em', cursor: 'pointer', boxShadow: '0 4px 0 #2A1524' }}>{v.copyLabel}</button>
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.7, letterSpacing: '.04em', color: '#8E7AAE' }}>TAP A CAT TO UNLEASH IT · TAP AGAIN TO CALM IT · ARROWS + ENTER · 1 2 3 HINTS · R TIDY UP</div>
          </aside>
        </div>
      </div>
      <div id="cc-flash" style={{ position: 'fixed', inset: 0, background: '#FFE9FF', opacity: 0, pointerEvents: 'none', zIndex: 30 }}></div>
      </>
    );
  }
}
