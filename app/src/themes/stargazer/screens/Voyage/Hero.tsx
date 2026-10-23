import { memo, type CSSProperties } from 'react';
import { Planet } from '../../kit/Planet';

const RING_A = 'color-mix(in srgb, var(--sg-saturn-1) 70%, transparent)';
const RING_B = 'color-mix(in srgb, var(--sg-saturn-2) 60%, transparent)';
const GLOW: Record<string, string> = { venus: '0 0 60px color-mix(in srgb, var(--sg-venus-1) 45%, transparent)' };
const BANDS: Record<string, string> = {
  jupiter: 'repeating-linear-gradient(172deg, transparent 0 11%, color-mix(in srgb, var(--sg-jupiter-3) 28%, transparent) 11% 15%, transparent 15% 19%, color-mix(in srgb, var(--sg-jupiter-1) 25%, transparent) 19% 22%)',
  neptune: 'repeating-linear-gradient(176deg, transparent 0 17%, color-mix(in srgb, var(--sg-neptune-1) 18%, transparent) 17% 20%)',
};

interface Props { art: string; x: number; y: number; size: number; opacity?: number; tilt?: number }

/* A world in flight: the kit's sphere, with Saturn's rings and the bands of the gas giants. */
export const Hero = memo(function Hero({ art, x, y, size, opacity = 1, tilt = 0.26 }: Props) {
  if (size <= 0 || opacity <= 0) return null;
  const ring = (w: number, col: string, th: number, front: boolean): CSSProperties => ({
    position: 'absolute', left: x - w / 2, top: y - (w * tilt) / 2, width: w, height: w * tilt, borderRadius: '50%', boxSizing: 'border-box',
    border: `${th}px solid ${col}`, transform: 'rotate(-14deg)', clipPath: front ? 'inset(50% 0 0 0)' : 'none',
  });
  const sat = art === 'saturn';
  const rings = (front: boolean) => sat && (
    <>
      <div style={ring(size * 2.3, RING_A, Math.max(1, size * 0.05), front)} />
      <div style={ring(size * 1.8, RING_B, Math.max(1, size * 0.035), front)} />
    </>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      {rings(false)}
      <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', boxShadow: GLOW[art] }}>
        <Planet art={art} style={{ width: '100%', height: '100%' }} />
        {BANDS[art] && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: BANDS[art] }} />}
      </div>
      {rings(true)}
    </div>
  );
});
