import { useCallback, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { Level } from '../../../domain/types';
import { cx } from '../kit/cx';
import { clamp } from '../kit/motion';
import { ScopeArt } from './ScopeArt';
import { SkyBoard } from './SkyBoard';
import type { Box } from './sky';
import { slewDistance, type Pace, type SlewFrame } from './slew';
import { useSlew, type SlewRun } from './useSlew';
import styles from './SkyStage.module.css';

const ignore = () => {};

interface Props {
  level: Level | null;
  placed: number[];
  /** which sky of the mode this is (tonight's index, the voyage level, the Rush step): a new slot is a slew */
  slot: number;
  pace: Pace;
  wide: boolean;
  /** the board fills the stage: the parent measures it (`useBoxSize`, for the arrow keys too) and passes its size back */
  measure?: (el: HTMLDivElement | null) => void;
  box?: Box | null;
  /** the board itself */
  children: ReactNode;
}

/* Where the board sits. Moving on to another sky is a slew of the telescope (slew.ts): the view closes to an eyepiece,
   the sky just charted slides away, faint stars streak past, the next sky drifts in out of focus and is racked sharp.
   A tap during it skips to the end. Drawing only: the new sky is already the session's, and taps never reach it
   mid-slew. */
export function SkyStage({ level, placed, slot, pace, wide, measure, box = null, children }: Props) {
  const stage = useRef<HTMLDivElement | null>(null);
  const setStage = useCallback((el: HTMLDivElement | null) => { stage.current = el; measure?.(el); }, [measure]);
  const { slew, skip } = useSlew(level, placed, slot, pace, stage);
  const onSkip = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); skip(); };

  const run = slew?.run;
  const f = slew?.frame;
  const d = run ? slewDistance(run.heading, run.w, run.h) : 0;
  const short = run ? Math.min(run.w, run.h) : 0;
  const shift = (k: number) => run ? `translate(${(run.heading.dx * d * k).toFixed(1)}px, ${(run.heading.dy * d * k).toFixed(1)}px)` : '';
  const current: CSSProperties | undefined = f && {
    transform: `${shift(1 - f.travel)} scale(${f.zoom.toFixed(4)})`, opacity: f.incoming,
    filter: f.blur > 0.05 ? `blur(${f.blur.toFixed(2)}px)` : undefined,
  };
  /* one tree whether or not a slew is on, so the live board is never remounted */
  return (
    <div ref={setStage} className={cx(styles.stage, wide && styles.wide)} onClickCapture={slew ? onSkip : undefined}>
      <div className={cx(styles.view, slew && styles.moving)}>
        {run && f && <Field run={run} frame={f} distance={d} pace={pace} />}
        {run && f && (
          <div className={cx(styles.layer, styles.outgoing)} aria-hidden="true" style={{ transform: shift(-f.travel), opacity: f.outgoing }}>
            <SkyBoard level={run.from.level} placed={run.from.placed} sweep={false} ring={null} focus={null} onTapStar={ignore} box={box} />
          </div>
        )}
        <div className={styles.layer} style={current}>{children}</div>
      </div>
      {run && f && (
        <div className={styles.eyepiece} aria-hidden="true"
          style={{ width: short, height: short, opacity: f.shut, transform: `translate(-50%, -50%) scale(${f.ring.toFixed(4)})` }}>
          <Reticle />
        </div>
      )}
      {run && f && <ScopeArt turn={f.turn} heading={run.heading} size={clamp(short * 0.3, 64, 140)} opacity={f.shut} />}
    </div>
  );
}

/** The faint stars between the two skies, streaking along the way the telescope moves. */
function Field({ run, frame, distance, pace }: { run: SlewRun; frame: SlewFrame; distance: number; pace: Pace }) {
  const short = Math.min(run.w, run.h);
  const streak = frame.speed * Math.min(70, distance * 0.09) * (pace === 'brisk' ? 1.4 : 1);
  return (
    <svg className={styles.field} viewBox={`0 0 ${run.w} ${run.h}`} aria-hidden="true" style={{ opacity: Math.min(1, frame.speed * 2.5) }}>
      <g transform={`translate(${run.w / 2} ${run.h / 2}) rotate(${run.heading.angle}) translate(${(-frame.travel * distance).toFixed(1)} 0)`}>
        {run.field.map((s, i) => (
          <rect key={i} className={styles.fieldStar} x={s.u * distance - s.r - streak / 2} y={s.v * short - s.r}
            width={2 * s.r + streak} height={2 * s.r} rx={s.r} opacity={s.a} />
        ))}
      </g>
    </svg>
  );
}

/** The eyepiece's crosshair: two broken hairlines and a small centre ring. */
function Reticle() {
  return (
    <svg className={styles.reticle} viewBox="-50 -50 100 100">
      <line x1={-47} y1={0} x2={-9} y2={0} />
      <line x1={9} y1={0} x2={47} y2={0} />
      <line x1={0} y1={-47} x2={0} y2={-9} />
      <line x1={0} y1={9} x2={0} y2={47} />
      <circle r={4} />
    </svg>
  );
}
