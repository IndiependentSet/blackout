import { memo, type CSSProperties, type ReactNode } from 'react';
import { alpha, clamp, lerp } from './motion';
import { PTS, tones } from './flightParticles';
import { H, W } from './stage';

const TWINKLE = 'var(--sg-twinkle)';
const v = (art: string, n: 1 | 2 | 3) => `var(--sg-${art}-${n})`;
const sphere = (art: string) => `radial-gradient(circle at 38% 32%, ${tones(art)[0]}, ${tones(art)[1]} 60%, ${tones(art)[2]})`;

interface Moon { r: number; sp: number; ph: number; s: number; bg: string }
const MARS_MOONS: Moon[] = [
  { r: 1.25, sp: 1.9, ph: 0.4, s: 0.07, bg: sphere('mercury') }, { r: 1.75, sp: 1.1, ph: 2.6, s: 0.05, bg: sphere('moon') },
];
const JUPITER_MOONS: Moon[] = [
  { r: 1.3, sp: 2.2, ph: 0.2, s: 0.07, bg: sphere('venus') }, { r: 1.6, sp: 1.6, ph: 2.1, s: 0.06, bg: sphere('moon') },
  { r: 2.0, sp: 1.1, ph: 4.0, s: 0.09, bg: sphere('mercury') },
  { r: 2.5, sp: 0.7, ph: 5.3, s: 0.08, bg: `radial-gradient(circle at 38% 32%, ${v('moon', 2)}, ${v('moon', 3)} 60%, var(--sg-night-0))` },
];

export interface MotifProps {
  T: number;
  art: string;
  /** how much of the scenery shows, 0 to 1 */
  m: number;
  /** progress through the cruise and through the approach, 0 to 1 */
  k: number;
  a: number;
  /** where the world is, and how big */
  cx: number;
  cy: number;
  size: number;
  /** behind the world, in front of it (the moons), or over everything */
  layer: 'back' | 'front' | 'over';
}

const at = (x: number, y: number, s: number, bg: string, opacity: number, extra?: CSSProperties): CSSProperties =>
  ({ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: '50%', background: bg, opacity, ...extra });

/* What the target world looks like on the way in: Mercury's sun, Venus' clouds, Mars' dust and moons, Jupiter's
   moons, Saturn's ice, Neptune's wind. Pure in its props; the particles are module constants. */
export const Motif = memo(function Motif({ T: t, art, m, k, a, cx, cy, size, layer }: MotifProps) {
  if (m <= 0) return null;
  const els: ReactNode[] = [];
  const orbit = (moons: Moon[]) => moons.forEach((mo, i) => {
    const ang = t * mo.sp + mo.ph;
    const front = Math.sin(ang) > 0;
    if ((layer === 'front') !== front) return;
    const r = (size / 2) * mo.r;
    els.push(<div key={'o' + i} style={at(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.32, Math.max(2, size * mo.s), mo.bg, m * (front ? 1 : 0.7))} />);
  });
  const fill = (key: string, background: string, opacity: number) => els.push(<div key={key} style={{ position: 'absolute', inset: 0, background, opacity }} />);

  if (art === 'mercury' && layer === 'back') {
    const sr = 200 + k * 120 + a * 260;
    els.push(<div key="sun" style={at(440, 110, sr * 2, `radial-gradient(circle, ${TWINKLE} 0%, var(--sg-glow-core) 18%, ${alpha('var(--sg-glow-edge)', 0.45)} 42%, transparent 70%)`, m)} />);
    ([[0.55, 34], [0.95, 12], [1.25, 56], [1.6, 20]] as const).forEach(([f, s], i) => {
      els.push(<div key={'fl' + i} style={at(lerp(440, 195, f), lerp(110, 422, f), s * (1 + a), alpha('var(--sg-glow-core)', 0.14), m * 0.8, { boxShadow: `inset 0 0 0 1px ${alpha('var(--sg-glow-core)', 0.35)}` })} />);
    });
  }
  if (art === 'mercury' && layer === 'over') fill('heat', `radial-gradient(80% 60% at 100% 0%, ${alpha('var(--sg-glow-edge)', 0.55)}, transparent 70%)`, m * (0.3 + a * 0.7));
  if (art === 'venus' && layer === 'over') {
    const inten = clamp(k * 1.6 - 0.9, 0, 1) * 0.5 + a;
    PTS.slice(0, 16).forEach((p, i) => {
      const q = (p.ph + t * 0.22 + a * 0.9) % 1;
      const r = Math.pow(q, 2) * 520, s = 70 + q * 520;
      els.push(<div key={'c' + i} style={{ position: 'absolute', left: cx + Math.cos(p.a) * r - s * 0.8, top: cy + Math.sin(p.a) * r * 0.8 - s / 2, width: s * 1.6, height: s, borderRadius: '50%',
        background: `radial-gradient(closest-side, ${alpha(v('venus', 1), 0.85)}, ${alpha(v('venus', 2), 0.45)} 60%, transparent)`, filter: 'blur(6px)', opacity: Math.sin(q * Math.PI) * 0.6 * m * clamp(inten, 0, 1) }} />);
    });
    fill('wash', v('venus', 1), m * a * 0.45);
  }
  if (art === 'mars' && layer === 'over') {
    const inten = 0.25 * k + a;
    PTS.forEach((p, i) => {
      const q = (p.x + t * p.sp * (0.35 + a * 1.6)) % 1;
      const s = 1.5 + p.s * 3;
      els.push(<div key={'d' + i} style={{ position: 'absolute', left: W + 40 - q * (W + 120), top: p.y * H + q * 140 - 70, width: s * (1 + a * 7), height: s, borderRadius: s,
        background: i % 3 ? v('mars', 1) : v('mars', 2), opacity: m * clamp(inten, 0, 1) * (0.4 + 0.6 * p.s), transform: 'rotate(-17deg)' }} />);
    });
    fill('wash', `radial-gradient(90% 70% at 50% 50%, transparent 30%, ${alpha(v('mars', 2), 0.6)})`, m * a);
  }
  if (art === 'mars' && layer !== 'over') orbit(MARS_MOONS);
  if (art === 'jupiter' && layer !== 'over') orbit(JUPITER_MOONS);
  if (art === 'saturn' && layer === 'over') {
    PTS.forEach((p, i) => {
      const side = i % 2 ? 1 : -1;
      const q = (p.ph + t * 0.35 + a * 1.4) % 1;
      const s = 1 + q * 7 * (0.5 + p.s);
      els.push(<div key={'i' + i} style={{ position: 'absolute', left: cx + side * (q * q * 420 + 8) - s / 2, top: cy + (p.y - 0.5) * (12 + q * 120) - s / 2, width: s, height: s, borderRadius: 2,
        background: i % 4 ? v('saturn', 1) : v('saturn', 2), transform: `rotate(${p.a * 57}deg)`, opacity: m * clamp(a * 1.4 + k * 0.15, 0, 1) * Math.min(1, q * 4) }} />);
    });
  }
  if (art === 'neptune' && layer === 'over') {
    PTS.slice(0, 34).forEach((p, i) => {
      const q = (p.x + t * p.sp * (0.5 + a * 2.2)) % 1;
      const w = 40 + p.sp * 120 * (1 + a * 2);
      els.push(<div key={'w' + i} style={{ position: 'absolute', left: W + 60 - q * (W + w + 160), top: p.y * H, width: w, height: 1.5, borderRadius: 2,
        background: `linear-gradient(90deg, ${alpha(v('neptune', 1), 0.9)}, transparent)`, opacity: m * clamp(0.3 * k + a, 0, 1) * 0.7 }} />);
    });
    PTS.slice(34).forEach((p, i) => {
      const q = (p.ph + t * 0.3) % 1;
      const r = 30 + q * q * 480, s = 2 + p.s * 3 + q * 3;
      els.push(<div key={'s' + i} style={{ position: 'absolute', left: cx + Math.cos(p.a) * r - s / 2, top: cy + Math.sin(p.a) * r - s / 2, width: s, height: s,
        background: i % 3 ? TWINKLE : v('neptune', 1), transform: 'rotate(45deg)', opacity: m * Math.sin(q * Math.PI) * (0.4 + k * 0.6) }} />);
    });
    fill('wash', `radial-gradient(90% 70% at 50% 50%, transparent 25%, ${alpha(v('neptune', 3), 0.75)})`, m * (0.3 + a * 0.7));
  }
  return els.length ? <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>{els}</div> : null;
});
