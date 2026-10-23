import { memo } from 'react';
import { Planet } from '../../kit/Planet';
import { CHAPTERS } from '../../../../domain/campaign';
import { planetOf } from '../../copy';
import { alpha, lerp } from './motion';
import { W } from './stage';

const X0 = 40;
const X1 = 350;

/* The worlds row drawn as a line the ship travels: a gold fill and the ship's dot move from the old world to the new one. */
export const Route = memo(function Route({ from, to, prog, op }: { from: number; to: number; prog: number; op: number }) {
  if (op <= 0) return null;
  const gap = (X1 - X0) / (CHAPTERS.length - 1);
  const sx = lerp(X0 + from * gap, X0 + to * gap, prog);
  return (
    <div style={{ position: 'absolute', left: 0, top: 136, width: W, height: 24, opacity: op }}>
      <div style={{ position: 'absolute', left: X0, width: X1 - X0, top: 11, height: 2, borderRadius: 2, background: 'var(--sg-hairline)' }} />
      <div style={{ position: 'absolute', left: X0, width: sx - X0, top: 11, height: 2, borderRadius: 2, background: 'var(--sg-gold)' }} />
      {CHAPTERS.map(c => (
        <Planet key={c.index} art={planetOf(c.index).art} size={16}
          style={{ position: 'absolute', left: X0 + c.index * gap - 8, top: 4, opacity: c.index > to ? 0.35 : 1,
            boxShadow: c.index === to ? `0 0 0 2px var(--sg-night-0), 0 0 0 4px ${alpha('var(--sg-gold)', 0.6 + 0.4 * prog)}` : 'none' }} />
      ))}
      <div style={{ position: 'absolute', left: sx - 5, top: 7, width: 10, height: 10, borderRadius: '50%', background: 'var(--sg-cream)', boxShadow: '0 0 12px var(--sg-gold)' }} />
    </div>
  );
});
