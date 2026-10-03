import { useEffect, useRef, useState } from 'react';
import { BREEDS } from './assets/cats';
import { THINGS } from './assets/things';
import { CatFlipbook, PadSprite, PathLit, PathWeb, ThingSprite, SpriteDefs, CONTACT_SHADOW, CAT_FOOT, PAD_HIT_R, THING_D } from './sprites';

/* ---- CATASTROPHE INC. orientation: the "how it works" slideshow ----
   Shown over the work order. Every illustration is a tiny live board drawn
   with the same stickers, pads and two-tone paths as the real game, so what a
   new hire learns here is exactly what they will see on site. Nothing in here
   touches engine.js; the training site is a hand-made graph whose cheapest
   crew ({hub, D}) is unique, same as every real level. */

const luckiest = "'Luckiest Guy', cursive";
const thing = n => THINGS.find(t => t.name === n) || THINGS[0];
const breed = i => BREEDS[i % BREEDS.length];
/* the smashables are drawn a touch smaller on these little boards */
const THING_SCALE = 46 / THING_D;
const PATH_SCALE = 0.6;

/* -------- the board pieces -------- */

function Pad({ x, y, cat, b = 0, onTap, pulse }) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onTap} style={{ cursor: onTap ? 'pointer' : 'default' }}>
      <PadSprite breed={breed(b)} hired={cat} pulsing={pulse} />
      {/* a fat invisible target, so a thumb never misses the pad */}
      {onTap && <circle cx={0} cy={0} r={PAD_HIT_R} fill="transparent" />}
    </g>
  );
}

function Path({ a, b, lit }) {
  const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  return (
    <>
      <PathWeb d={d} scale={PATH_SCALE} />
      <PathLit d={d} on={lit} scale={PATH_SCALE} />
    </>
  );
}

function Thing({ x, y, t, smashed, i = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${THING_SCALE})`}>
      <ThingSprite thing={t} smashed={smashed} index={i} marked={false} />
    </g>
  );
}

/* a whole little site: pads, paths, and a fixture in the middle of each path */
function Board({ nodes, edges, placed, onTap, pulse, viewBox, label }) {
  const on = new Set(placed);
  return (
    <svg viewBox={viewBox} width="100%" role="img" aria-label={label}
      style={{ display: 'block', touchAction: 'manipulation', userSelect: 'none' }}>
      <defs><SpriteDefs /></defs>
      {edges.map(([u, v], i) => <Path key={'e' + i} a={nodes[u]} b={nodes[v]} lit={on.has(u) || on.has(v)} />)}
      {edges.map(([u, v, t], i) => (
        <Thing key={'t' + i} i={i} t={thing(t)} smashed={on.has(u) || on.has(v)}
          x={(nodes[u].x + nodes[v].x) / 2} y={(nodes[u].y + nodes[v].y) / 2} />
      ))}
      {nodes.map((n, i) => (
        <Pad key={'n' + i} x={n.x} y={n.y} b={n.b ?? i} cat={on.has(i)}
          pulse={pulse === i} onTap={onTap ? () => onTap(i) : undefined} />
      ))}
    </svg>
  );
}

/* the plank floor the work order's own diagram sits on */
function Floor({ children, pad = 10 }) {
  return (
    <div style={{ background: 'repeating-linear-gradient(96deg, #6B4730 0 46px, #664129 46px 48px, #6E4A32 48px 94px, #5E3B25 94px 96px)', border: '5px solid #34200F', borderRadius: 16, boxShadow: '0 6px 0 #1E1208, inset 0 0 60px rgba(0,0,0,.55)', padding: pad, position: 'relative' }}>
      {children}
    </div>
  );
}

function Stamp({ children, color = '#8CE8B0', style }) {
  return (
    <span style={{ display: 'inline-block', fontFamily: luckiest, fontSize: 16, letterSpacing: '.05em', color: '#2A1524', background: color, border: '3px solid #2A1524', borderRadius: 9, boxShadow: '0 3px 0 #2A1524', padding: '3px 10px', whiteSpace: 'nowrap', animation: 'cc-stamp .45s cubic-bezier(.2,1.4,.4,1) both', ...style }}>{children}</span>
  );
}

/* a clock for the looping demos: ticks once every `ms`, restarting per slide */
function useTick(ms) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setT(n => n + 1), ms);
    return () => clearInterval(h);
  }, [ms]);
  return t;
}

/* -------- the demos, one per slide -------- */

function CrewDemo() {
  const items = ['vase', 'lamp', 'fishbowl', 'mug', 'clock', 'plant'];
  return (
    <Floor>
      <svg viewBox="0 0 330 150" width="100%" role="img" aria-label="the crew, and the client's belongings" style={{ display: 'block' }}>
        <defs><SpriteDefs /></defs>
        <text x={8} y={16} fontFamily="Luckiest Guy, cursive" fontSize={12} fill="#F06BFF" letterSpacing={2}>THE CREW</text>
        {BREEDS.map((b, i) => (
          <g key={b.name} transform={`translate(${30 + i * 54} 48)`}>
            <ellipse cx={0} cy={CAT_FOOT + 2} rx={20} ry={6} fill={CONTACT_SHADOW} />
            <CatFlipbook breed={b} pounceDelay={-i * 0.13} frameDelay={-i * 0.2} />
          </g>
        ))}
        <text x={8} y={94} fontFamily="Luckiest Guy, cursive" fontSize={12} fill="#FFD469" letterSpacing={2}>THE CLIENT’S STUFF</text>
        {items.map((n, i) => <Thing key={n} i={i} t={thing(n)} x={30 + i * 54} y={128} />)}
      </svg>
    </Floor>
  );
}

function PathDemo() {
  const t = useTick(1300);
  const phase = t % 4;           // 0 empty · 1-2 cat on the left · 3 cat on the right
  const placed = phase === 0 ? [] : phase === 3 ? [1] : [0];
  const nodes = [{ x: 60, y: 82, b: 4 }, { x: 260, y: 82, b: 1 }];
  return (
    <Floor>
      <Board viewBox="0 0 320 125" nodes={nodes} edges={[[0, 1, 'vase']]} placed={placed} label="one path between two pads" />
      <div style={{ textAlign: 'center', fontFamily: luckiest, fontSize: 14, letterSpacing: '.06em', color: placed.length ? '#F06BFF' : '#FFD469', minHeight: 20 }}>
        {phase === 0 ? 'TWO EMPTY PADS. ONE NERVOUS VASE.' : phase === 3 ? 'OTHER END? STILL SCRAP.' : 'CAT ON ONE END → SCRAP.'}
      </div>
    </Floor>
  );
}

function StarDemo() {
  const t = useTick(1500);
  const on = t % 3 !== 0;
  const nodes = [{ x: 160, y: 98, b: 3 }, { x: 50, y: 48 }, { x: 270, y: 48 }, { x: 50, y: 160 }, { x: 270, y: 160 }];
  const edges = [[0, 1, 'lamp'], [0, 2, 'books'], [0, 3, 'fishbowl'], [0, 4, 'plant']];
  return (
    <Floor>
      <Board viewBox="0 0 320 195" nodes={nodes} edges={edges} placed={on ? [0] : []} label="one cat on a busy pad covers four paths" />
      <div style={{ position: 'absolute', right: 14, top: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {on && <Stamp key={t} color="#F06BFF">1 CAT · 4 SMASHED</Stamp>}
      </div>
    </Floor>
  );
}

function BudgetDemo() {
  const t = useTick(2200);
  const on = t % 2 === 1;
  const nodes = [{ x: 46, y: 60, b: 2 }, { x: 140, y: 60, b: 5 }, { x: 234, y: 60, b: 0 }];
  const edges = [[0, 1, 'mug'], [1, 2, 'clock']];
  const box = (placed, ok) => (
    <Floor pad={4}>
      <div style={{ position: 'absolute', left: 10, top: 6, fontFamily: luckiest, fontSize: 13, letterSpacing: '.06em', color: '#FFD469' }}>{ok ? 'CREW B' : 'CREW A'}</div>
      <Board viewBox="0 0 280 100" nodes={nodes} edges={edges} placed={on ? placed : []} label={ok ? 'one cat in the middle' : 'two cats on the ends'} />
      <div style={{ position: 'absolute', right: 8, bottom: -12, zIndex: 1 }}>
        {on && (ok
          ? <Stamp key={'g' + t} style={{ transform: 'rotate(-4deg)' }}>1 CAT · PURR-FECT</Stamp>
          : <Stamp key={'b' + t} color="#FF8FA8" style={{ transform: 'rotate(3deg)' }}>2 CATS · ACCOUNTS NOTICE</Stamp>)}
      </div>
    </Floor>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 10 }}>
      {box([0, 2], false)}
      {box([1], true)}
    </div>
  );
}

/* the training site: two leaves hang off the hub, a three-pad tail hangs off
   the other side. Only {hub, D} covers all five paths with two cats. */
const TRAIN_NODES = [
  { x: 52, y: 52, b: 0 }, { x: 52, y: 170, b: 1 }, { x: 128, y: 111, b: 2 },
  { x: 214, y: 66, b: 3 }, { x: 278, y: 140, b: 4 }, { x: 196, y: 186, b: 5 },
];
const TRAIN_EDGES = [[0, 2, 'mug'], [1, 2, 'pot'], [2, 3, 'lamp'], [3, 4, 'books'], [4, 5, 'fishbowl']];
const TRAIN_K = 2;

function TrainingDemo() {
  const [placed, setPlaced] = useState([]);
  const [taps, setTaps] = useState(0);
  const tap = i => {
    setTaps(n => n + 1);
    setPlaced(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i]));
  };
  const on = new Set(placed);
  const smashed = TRAIN_EDGES.filter(([u, v]) => on.has(u) || on.has(v)).length;
  const done = smashed === TRAIN_EDGES.length;
  const perfect = done && placed.length === TRAIN_K;
  /* after a few wrong-ish taps, point at a leaf the way SURVEY does */
  const pulse = !done && taps >= 3 && !on.has(2) ? 0 : undefined;
  let note = 'TAP A PAD TO HIRE · TAP AGAIN TO RECALL';
  let color = '#C9B8E0';
  if (perfect) { note = 'HIRED! YOU’RE A NATURAL.'; color = '#8CE8B0'; }
  else if (done) { note = `ALL SMASHED… BUT ${placed.length - TRAIN_K} CAT${placed.length - TRAIN_K > 1 ? 'S' : ''} OVER BUDGET`; color = '#FF8FA8'; }
  else if (placed.length > TRAIN_K) { note = 'PAYROLL SAYS NO — THAT’S OVER BUDGET'; color = '#FF8FA8'; }
  else if (pulse !== undefined) { note = 'PSST: THAT GLOWING PAD HAS ONE PATH. HIRE ITS NEIGHBOUR.'; color = '#FFD469'; }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', fontFamily: luckiest, fontSize: 15, letterSpacing: '.04em' }}>
        <span style={{ color: placed.length > TRAIN_K ? '#FF8FA8' : '#FFD469' }}>CATS {placed.length}/{TRAIN_K}</span>
        <span style={{ color: '#F06BFF' }}>SMASHED {smashed}/{TRAIN_EDGES.length}</span>
        <button type="button" onClick={() => { setPlaced([]); setTaps(0); }}
          style={{ background: '#F4E4C4', border: '3px solid #2A1524', borderRadius: 9, boxShadow: '0 3px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>RECALL CREW</button>
      </div>
      <Floor>
        <Board viewBox="0 0 320 215" nodes={TRAIN_NODES} edges={TRAIN_EDGES} placed={placed} onTap={tap} pulse={pulse} label="training site: tap pads to hire cats" />
        {perfect && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <Stamp style={{ fontSize: 30, padding: '6px 18px', transform: 'rotate(-8deg)' }}>PURR-FECT!</Stamp>
          </div>
        )}
      </Floor>
      <div role="status" style={{ textAlign: 'center', fontSize: 13, fontWeight: 900, letterSpacing: '.06em', color, minHeight: 36 }}>{note}</div>
    </div>
  );
}

function ConsultDemo() {
  const tiers = [
    { label: 'SURVEY', body: 'Points at a pad with only one path. Its neighbour is always the safe hire.', icon: '🔍' },
    { label: 'ESTIMATE', body: 'Proves the fewest cats this site can possibly need.', icon: '🧮' },
    { label: 'INSIDER', body: 'Leaks one pad from the purr-fect crew. Costs you some pride.', icon: '🤫' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tiers.map((h, i) => (
        <div key={h.label} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 14px 8px 14px', boxShadow: '0 4px 0 #2A1524', padding: '10px 12px', animation: `cc-cardin .5s ${i * 0.12}s both` }}>
          <span aria-hidden="true" style={{ flex: 'none', fontSize: 26 }}>{h.icon}</span>
          <div>
            <div style={{ fontFamily: luckiest, fontSize: 17, color: '#6E3FA3', letterSpacing: '.04em' }}>{h.label}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#5A3E27', lineHeight: 1.35 }}>{h.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekDemo({ sites }) {
  const t = useTick(450);
  const lit = Math.min(t, 7);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, height: 92 }}>
        {sites.map((s, i) => {
          const h = 34 + i * 9;
          return (
            <div key={s} title={s} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 46, height: h, background: i < lit ? '#C877D8' : 'rgba(255,255,255,.1)', border: '3px solid #2A1524', borderRadius: '6px 6px 3px 3px', boxShadow: '0 3px 0 #2A1524', transition: 'background .25s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: luckiest, fontSize: 15, color: i < lit ? '#2A1524' : '#8E7AAE' }}>
                {i < lit ? 'S' : i + 1}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 900, letterSpacing: '.12em', color: '#8E7AAE' }}>S = SITE CLOSED ON BUDGET</div>
      <div style={{ minHeight: 40, display: 'flex', justifyContent: 'center' }}>
        {lit === 7 && <Stamp style={{ fontSize: 20, transform: 'rotate(-4deg)' }}>WEEKLY INVOICE: PURR-FECT</Stamp>}
      </div>
    </div>
  );
}

/* -------- the slideshow -------- */

export default function HowToPlay({ onClose, onStart, sites }) {
  const slides = [
    { kicker: 'WELCOME ABOARD', title: <>WE DEMOLISH HOUSES. <span style={{ color: '#F06BFF' }}>WITH CATS.</span></>,
      body: 'You’re the new site manager at CATASTROPHE INC. Clients want their homes wrecked from the inside, and your crew is six deeply unprofessional cats.',
      demo: <CrewDemo /> },
    { kicker: 'LESSON 1 · PADS & PATHS', title: 'EVERY FIXTURE SITS ON A PATH.',
      body: 'Dashed paths join two deployment pads. Drop a cat on either end and whatever sits on that path is scrap.',
      demo: <PathDemo /> },
    { kicker: 'LESSON 2 · ECONOMIES OF SCALE', title: <>ONE CAT. <span style={{ color: '#F06BFF' }}>MANY CASUALTIES.</span></>,
      body: 'A cat wrecks every path touching its pad. Busy pads are where the real damage happens.',
      demo: <StarDemo /> },
    { kicker: 'LESSON 3 · PAYROLL', title: 'HIRE THE FEWEST CATS.',
      body: 'Every site has a budget. Both of these crews flatten the room. Only one of them gets you paid.',
      demo: <BudgetDemo /> },
    { kicker: 'TRAINING SITE', title: <>YOUR TURN. <span style={{ color: '#FFD469' }}>BUDGET: 2 CATS.</span></>,
      body: 'Smash all five fixtures with just two cats. There’s exactly one way to do it.',
      demo: <TrainingDemo /> },
    { kicker: 'STUCK?', title: 'CONSULT THE EXPERTS.',
      body: 'Every site has exactly one purr-fect crew, and it can always be worked out. If you can’t, three consultants are on call.',
      demo: <ConsultDemo /> },
    { kicker: 'THE WEEKLY INVOICE', title: <>7 SITES. <span style={{ color: '#F06BFF' }}>ONE WORKING WEEK.</span></>,
      body: 'Seven fresh sites every day, the same for every crew in the company, each one bigger than the last. Bring all seven in on budget and the invoice reads PURR-FECT.',
      demo: <WeekDemo sites={sites} /> },
  ];
  const last = slides.length - 1;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const go = n => {
    const to = Math.max(0, Math.min(last, n));
    if (to === i) return;
    setDir(to > i ? 1 : -1);
    setI(to);
  };
  const next = () => (i === last ? onStart() : go(i + 1));

  /* the game's own key handler stands down while this is open */
  const keys = useRef(null);
  const onKey = e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); next(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };
  useEffect(() => { keys.current = onKey; });
  useEffect(() => {
    const h = e => keys.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  /* horizontal swipe flips slides; anything shorter is a tap on the board */
  const swipe = useRef(null);
  const onDown = e => { swipe.current = { x: e.clientX, y: e.clientY }; };
  const onUp = e => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(i + (dx < 0 ? 1 : -1));
  };

  const s = slides[i];
  const btn = { minHeight: 48, padding: '0 18px', border: '4px solid #2A1524', borderRadius: 14, boxShadow: '0 5px 0 #2A1524', fontFamily: luckiest, fontSize: 18, letterSpacing: '.05em', cursor: 'pointer' };
  return (
    <div role="dialog" aria-modal="true" aria-label="How CATASTROPHE INC. works"
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(10,6,16,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, boxSizing: 'border-box', animation: 'cc-fadein .25s both', overflowY: 'auto' }}>
      <div onPointerDown={onDown} onPointerUp={onUp}
        style={{ width: '100%', maxWidth: 560, maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box', background: 'radial-gradient(120% 90% at 50% 0%, #2A1B3D 0%, #170F22 70%)', border: '4px solid #2A1524', borderRadius: 22, boxShadow: '0 10px 0 #2A1524, 0 0 0 3px rgba(247,179,43,.25)', padding: '16px 16px 18px', color: '#F4E4C4', display: 'flex', flexDirection: 'column', gap: 14, animation: 'cc-cardin .4s both' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: 9, boxShadow: '0 3px 0 #2A1524', padding: '3px 12px', fontFamily: luckiest, fontSize: 13, letterSpacing: '.06em', color: '#FFD469' }}>ORIENTATION · {i + 1}/{slides.length}</span>
          <button type="button" onClick={onClose} aria-label="skip the orientation"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#C9B8E0', fontFamily: luckiest, fontSize: 14, letterSpacing: '.08em', cursor: 'pointer', padding: '6px 4px' }}>SKIP ✕</button>
        </div>

        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: `${dir > 0 ? 'cc-slide-l' : 'cc-slide-r'} .32s cubic-bezier(.2,.9,.3,1) both` }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.18em', color: '#C877D8', marginBottom: 4 }}>{s.kicker}</div>
            <div style={{ fontFamily: luckiest, fontSize: 'clamp(24px, 6.4vw, 32px)', lineHeight: 1.05, color: '#F7B32B', textWrap: 'balance' }}>{s.title}</div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: '#EADDF7', textWrap: 'pretty' }}>{s.body}</div>
          {s.demo}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="previous slide"
            style={{ ...btn, padding: '0 12px', background: '#F4E4C4', color: '#3E2718', opacity: i === 0 ? 0.35 : 1, cursor: i === 0 ? 'default' : 'pointer' }}>←</button>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {slides.map((_, n) => (
              <button key={n} type="button" onClick={() => go(n)} aria-label={`slide ${n + 1}`} aria-current={n === i}
                style={{ flex: 'none', width: n === i ? 20 : 10, height: 10, padding: 0, borderRadius: 6, border: '2.5px solid #2A1524', background: n === i ? '#FFD469' : n < i ? '#C877D8' : 'rgba(255,255,255,.18)', cursor: 'pointer', transition: 'width .2s, background .2s' }} />
            ))}
          </div>
          <button type="button" onClick={next}
            style={{ ...btn, padding: '0 14px', whiteSpace: 'nowrap', background: i === last ? '#8CE8B0' : '#FFD469', color: '#3E2718' }}>{i === last ? 'CLOCK IN' : 'NEXT →'}</button>
        </div>
      </div>
    </div>
  );
}
