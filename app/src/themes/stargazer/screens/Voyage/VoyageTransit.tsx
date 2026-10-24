import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CHAPTERS, type CampaignClears } from '../../../../domain/campaign';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import '../../tokens.css';
import { planetOf } from '../../copy';
import { Starfield } from '../../kit/Starfield';
import { WIDE } from '../../kit/useWide';
import { FlightScreen } from './FlightScreen';
import { frameAt } from './frame';
import { STREAKS, tones } from './flightParticles';
import { Hero } from './Hero';
import { Motif, type MotifProps } from './Motif';
import { animate, Easing, lerp, MOTION, mix } from './motion';
import { Route } from './Route';
import { H, W } from './stage';
import { advance, CUES, isOver, skip, START_AT, TOTAL } from './timeline';
import { useStageFit } from './useStageFit';
import styles from './Voyage.module.css';

interface Props {
  /** chapter indexes; `to` is `from + 1` */
  from: number;
  to: number;
  onDone: () => void;
  /** where in the flight to join; the real screen has played the first beat */
  startAt?: number;
  /** the player's clears, so the screen under the flight reads the same as the real one */
  clears?: CampaignClears;
}

/* The flight between worlds: when the last level of a world is charted, the ship leaves for the next one. A full-screen
   overlay over the real Voyage screen (which already shows the world just charted). Every frame is a pure function of
   the clock T (frame.ts); it joins at `startAt`, where the real screen has already played the first beat, and ends on
   the new chapter's screen so the real one can take over. */
export function VoyageTransit({ from, to, onDone, startAt = START_AT, clears }: Props) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const wide = useMediaQuery(WIDE);
  const fit = useStageFit(wide);
  const [T, setT] = useState(reduced ? TOTAL : startAt);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  const over = isOver(T);

  useEffect(() => {
    if (over) return;
    let id = 0;
    let last: number | null = null;
    const frame = (now: number) => {
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      setT(t => advance(t, dt));
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [over]);

  /* reduced motion: the arrival, faded in, held a moment, then the real screen */
  useEffect(() => {
    if (!reduced) return;
    const id = window.setTimeout(() => done.current(), 700);
    return () => window.clearTimeout(id);
  }, [reduced]);
  useEffect(() => { if (over && !reduced) done.current(); }, [over, reduced]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') done.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const target = planetOf(to).art;
  const old = planetOf(from).art;
  const f = frameAt(T);
  const [c0, c1, c2] = tones(target);
  const size = CHAPTERS[from].to - CHAPTERS[from].from + 1;
  const base = CHAPTERS[from].from - 1;
  const flipAt = 0.3;
  const flipped = T >= flipAt;
  const stageStyle: CSSProperties = { transform: `translate(-50%, -50%) scale(${fit.scale})` };
  const px = (fit.vw - W * fit.scale) / 2 + f.tx * fit.scale;
  const py = (fit.vh - H * fit.scale) / 2 + f.ty * fit.scale;
  const shipX = lerp(195 + Math.sin(T * 2.1) * 8, f.tx, f.dive);
  const shipY = lerp(940 - 340 * f.shipIn + Math.sin(T * 3) * 4, f.ty, f.dive);
  const shipS = 1 - f.dive;
  const mp: Omit<MotifProps, 'layer'> = { T, art: target, m: f.motif, k: f.k, a: f.a, cx: f.tx, cy: f.ty, size: f.ts };

  return (
    <div className={`sg ${styles.transit} ${reduced ? styles.transitFade : ''}`} role="dialog" aria-modal="true" aria-live="polite"
      aria-label={`Flying to ${planetOf(to).name}`} onPointerDown={() => setT(skip)}>
      {!reduced && <div className={styles.layer} style={{ opacity: 1 - f.space * f.a }}><Starfield wide={wide} /></div>}
      {!reduced && f.space > 0 && (
        <div className={styles.layer} style={{ opacity: f.space,
          background: `radial-gradient(70% 55% at ${px}px ${py}px, ${mix('var(--sg-night-2)', c1, f.tint * 0.45)} 0%, ${mix('var(--sg-night-0)', c2, f.tint * 0.5)} 60%, #05060f 100%)` }} />
      )}
      <div className={styles.stage} style={stageStyle}>
        {f.uiOut < 1 && !reduced && (
          <div className={styles.layer} style={{ opacity: 1 - f.uiOut, transform: `translateY(${f.uiOut * 60}px) scale(${1 - f.uiOut * 0.06})` }}>
            <FlightScreen chapter={from} done={flipped ? size : size - 1} cleared={base + size - (flipped ? 0 : 1)} reach={T >= 0.7 ? to : from} clears={clears}
              fill={flipped && T < flipAt + 0.45 ? animate(T, (size - 1) / size, 1, flipAt, flipAt + 0.45, MOTION.enter) : undefined}
              unlock={T < 1 ? animate(T, 0, 1, 0.7, 1.0, MOTION.enter) : undefined}
              burst={(T - flipAt) / 0.55} end />
            {f.tapRing >= 0 && <div className={styles.tapRing} style={{ opacity: (1 - f.tapRing) * 0.8, transform: `scale(${0.3 + f.tapRing * 0.9})` }} />}
            {f.finger > 0 && <div className={styles.finger} style={{ top: f.fingerY - 22, opacity: f.finger, transform: `scale(${T > 1.2 && T < 1.4 ? 0.8 : 1})` }} />}
          </div>
        )}
        {!reduced && f.space > 0 && (
          <div className={styles.layer} style={{ opacity: f.space }}>
            <svg width={W} height={H} className={styles.layer} aria-hidden="true">
              {f.warp > 0 && STREAKS.map((s, i) => {
                const p = (s.ph + f.travel * 1.4) % 1;
                const r0 = 14 + Math.pow(p, 2) * 560, len = 4 + p * (16 + f.warp * 150);
                return <line key={i} x1={f.tx + Math.cos(s.a) * r0} y1={f.ty + Math.sin(s.a) * r0} x2={f.tx + Math.cos(s.a) * (r0 + len)} y2={f.ty + Math.sin(s.a) * (r0 + len)}
                  stroke={mix('var(--sg-twinkle)', c0, 0.25 + f.tint * 0.5)} strokeWidth={s.w} strokeLinecap="round" opacity={p * 0.9 * f.warp} />;
              })}
            </svg>
            <Motif {...mp} layer="back" />
            {f.heroOn && f.oldWorld < 1 && <Hero art={old} x={lerp(59, 195, f.oldWorld)} y={lerp(201, 1320, f.oldWorld)} size={lerp(130, 820, f.oldWorld)} />}
            {f.heroOn && <Hero art={target} x={f.tx} y={f.ty} size={f.ts} tilt={target === 'saturn' ? lerp(0.26, 0.05, Easing.easeInQuad(f.a)) : 0.26} />}
            <Motif {...mp} layer="front" />
            <Motif {...mp} layer="over" />
            {f.shipIn > 0 && shipS > 0.02 && (
              <div className={styles.ship} style={{ left: shipX, top: shipY, transform: `scale(${shipS})`, opacity: f.shipIn }}>
                <div className={styles.shipTrail} style={{ height: 50 + f.warp * 50 }} />
                <div className={styles.shipDot} />
              </div>
            )}
            {f.head > 0 && (
              <div className={styles.head} style={{ opacity: f.head, transform: `translateY(${(1 - f.head) * -16}px)` }}>
                <div className={styles.headEyebrow}>Chapter {to + 1} · en route</div>
                <div className={styles.headName}>{planetOf(to).name}</div>
              </div>
            )}
            <Route from={from} to={to} prog={f.route} op={f.head} />
          </div>
        )}
        {(f.arrival > 0 || reduced) && (
          <div className={styles.layer} style={reduced ? undefined : { opacity: f.arrival, transform: `translateY(${(1 - f.arrival) * 50}px)` }}>
            <FlightScreen chapter={to} done={0} cleared={base + size} reach={to}
              fill={0} pop={reduced ? undefined : animate(T, 1.7, 1, CUES.Arrival + 0.05, CUES.Arrival + 0.75, MOTION.pop)}
              ring={reduced ? undefined : animate(T, 0, 1, CUES.Arrival + 0.5, CUES.Arrival + 0.8, MOTION.enter)}
              glow={0.25 + 0.12 * Math.sin(T * 4)} />
          </div>
        )}
      </div>
      {!reduced && <div className={styles.layer} style={{ background: c0, opacity: f.flash, pointerEvents: 'none' }} />}
    </div>
  );
}