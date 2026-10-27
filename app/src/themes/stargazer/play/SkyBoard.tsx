import { memo, useId, useState } from 'react';
import type { Level } from '../../../domain/types';
import { Loupe } from './Loupe';
import { isTight, pickStar, pxPerUnit, reachOf } from './loupe';
import { CORE_R, HALO_R, skyOf, type Box } from './sky';
import { useLoupe } from './useLoupe';
import styles from './SkyBoard.module.css';

/** A four-point star, 15 units from tip to centre. */
export const STAR_PATH = 'M0 -15 C1.6 -4 4 -1.6 15 0 C4 1.6 1.6 4 0 15 C-1.6 4 -4 1.6 -15 0 C-4 -1.6 -1.6 -4 0 -15 Z';

interface Props {
  level: Level;
  placed: number[];
  /** Sweep: the dark lines march in mint */
  sweep: boolean;
  /** Count: the marked dark lines (indices into the level's edges), none when Count is off */
  counted?: number[] | null;
  /** Spot: the star the telescope rings, if any */
  ring: number | null;
  /** keyboard focus, drawn only once the keyboard has been used */
  focus: number | null;
  onTapStar: (node: number) => void;
  /** the board's size on screen: the sky turns and its stars grow to fit it (none: drawn as a preview is) */
  box?: Box | null;
}

/** The puzzle as a patch of night sky: tap a star to light it, and every line touching it glows. On a touch screen,
    when the stars are too close to tap easily, press and hold for the loupe: lifting lights the star ringed in it. */
export const SkyBoard = memo(function SkyBoard({ level, placed, sweep, counted = null, ring, focus, onTapStar, box }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const glowId = 'sg-glow' + uid, artId = 'sg-art' + uid;
  const sky = skyOf(level, placed, { box, tight: true });
  const at = (i: number | null) => (i == null ? null : sky.stars[i]);
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const ppu = box ? pxPerUnit(sky.viewBox, box) : 0;
  const reach = reachOf(sky.hit);
  const { open, handlers } = useLoupe(svg, !!box && isTight(sky.hit, ppu), box ? `${box.w}x${box.h}` : '', t => {
    const star = pickStar(sky.stars, t.world, reach);
    if (star != null) onTapStar(star);
  });
  const pick = open && at(pickStar(sky.stars, open.world, reach));
  const s = sky.scale;
  const dark = sky.lines.filter(l => !l.lit);
  const lit = sky.lines.filter(l => l.lit);
  const marked = counted ? new Set(counted) : null;
  const ringAt = at(ring), focusAt = at(focus);
  return (
    <>
    <svg ref={setSvg} className={styles.sky} viewBox={sky.viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Sky" {...handlers}>
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" className={styles.glowCore} />
          <stop offset=".4" className={styles.glowMid} />
          <stop offset="1" className={styles.glowEdge} />
        </radialGradient>
      </defs>
      <g id={artId}>
      {dark.map(l => (
        <line key={l.i} className={styles.lineDark} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          strokeWidth={2.5 * s} strokeDasharray={`${2 * s} ${9 * s}`} />
      ))}
      {sweep && dark.map(l => (
        <line key={'h' + l.i} className={styles.lineHot} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={3.5 * s} />
      ))}
      {marked && dark.filter(l => marked.has(l.i)).map(l => {
        /* a solid line with a tick across its middle: one star still to light on each, none shared */
        const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1) || 1;
        const tx = (-(l.y2 - l.y1) / len) * 7 * s, ty = ((l.x2 - l.x1) / len) * 7 * s;
        const mx = (l.x1 + l.x2) / 2, my = (l.y1 + l.y2) / 2;
        return (
          <g key={'c' + l.i} className={styles.counted} data-counted={l.i}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={4 * s} />
            <line x1={mx - tx} y1={my - ty} x2={mx + tx} y2={my + ty} strokeWidth={3 * s} />
          </g>
        );
      })}
      {lit.map(l => (
        <g key={l.i}>
          <line className={styles.lineGlow} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={10 * s} />
          <line className={styles.lineLit} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={3.5 * s} />
        </g>
      ))}
      {ringAt && <circle className={styles.ring} cx={ringAt.x} cy={ringAt.y} r={24 * s} strokeWidth={3 * s} />}
      {focusAt && <circle className={styles.focus} cx={focusAt.x} cy={focusAt.y} r={22 * s} strokeWidth={2 * s} />}
      {sky.stars.map(n => n.lit ? (
        <g key={n.i} className={styles.litStar}>
          <circle cx={n.x} cy={n.y} r={40 * s} fill={`url(#${glowId})`} />
          <path d={STAR_PATH} transform={`translate(${n.x} ${n.y}) scale(${s * n.size})`} className={styles.starShape} />
        </g>
      ) : (
        <g key={n.i}>
          <circle cx={n.x} cy={n.y} r={HALO_R * s * n.size} className={styles.halo} />
          <circle cx={n.x} cy={n.y} r={CORE_R * s * n.size} className={styles.dim} />
        </g>
      ))}
      </g>
      {sky.stars.map(n => (
        <circle key={'t' + n.i} className={styles.hit} cx={n.x} cy={n.y} r={sky.hit}
          role="button" tabIndex={-1} aria-pressed={n.lit} aria-label={'Star ' + (n.i + 1)} onClick={() => onTapStar(n.i)} />
      ))}
    </svg>
    {open && box && <Loupe artId={artId} touch={open} pick={pick || null} scale={s} ppu={ppu} board={box} />}
    </>
  );
});
