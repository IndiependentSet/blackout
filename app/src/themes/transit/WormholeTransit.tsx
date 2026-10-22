import { useEffect, type CSSProperties, type PointerEvent } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { WIDE } from '../stargazer/kit/useWide';
import '../stargazer/tokens.css';
import './tokens.css';
import { columnAt } from './art';
import { Backdrop } from './Backdrop';
import { CatBackdrop, CatWorld, Hired } from './CatWorld';
import { Cockpit } from './Cockpit';
import { ShipAI } from './ShipAI';
import { Tunnel, TunnelBackdrop } from './Tunnel';
import { clamp } from './motion';
import { CUES, START_AT } from './timeline';
import { useStage } from './useStage';
import { useTransitClock } from './useTransitClock';
import styles from './WormholeTransit.module.css';

interface Props {
  onDone: () => void;
  /** where in the film to join; the real Tonight screen has played the first 1.9 s */
  startAt?: number;
}

/* The easter egg between the seventh tap on the Stargazer title and the CATASTROPHE INC. look: the player boards
   the Stargazer-7, presses (or has pressed for them) the wrong button, falls through a wormhole and is hired by
   the cats. A full-screen overlay: the scenery fills the stage, the console and the hire stay in the centred column; every frame is a pure function of the clock's T (see timeline.ts). */
export function WormholeTransit({ onDone, startAt = START_AT }: Props) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const wide = useMediaQuery(WIDE);
  const stage = useStage(wide);
  const { clock, over, press, jump } = useTransitClock(startAt, reduced);
  const { T, branch } = clock;
  const shown = branch ?? 'slip';

  useEffect(() => { if (over) onDone(); }, [over, onDone]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const onPointerDown = (e: PointerEvent) => {
    if (!(e.target as Element).closest('[data-noskip]')) jump();
  };
  const flash = Math.max(0, 1 - Math.abs(T - (CUES.CatPlanet - 0.05)) / 0.3);
  const stageStyle: CSSProperties = { width: stage.w, height: stage.h, transform: `translate(-50%, -50%) scale(${stage.scale})` };
  const { ox, oy } = columnAt(stage);

  return (
    <div className={`sg transit ${styles.root} ${reduced ? styles.fade : ''}`} role="dialog" aria-modal="true" aria-label="Wormhole transit" onPointerDown={onPointerDown}>
      {!reduced && <Backdrop T={T} />}
      {!reduced && <TunnelBackdrop T={T} scale={stage.scale} vw={stage.vw} vh={stage.vh} />}
      <CatBackdrop T={T} />
      <div className={styles.stage} style={stageStyle}>
        {!reduced && <Tunnel T={T} frame={stage} />}
        <CatWorld T={T} branch={shown} frame={stage} />
        <div className={styles.column} style={{ left: ox, top: oy }}>
          {!reduced && <Cockpit T={T} branch={shown} decided={branch !== null} onChoose={press} />}
          <Hired T={T} branch={shown} onDone={onDone} />
          {!reduced && <ShipAI T={T} branch={shown} />}
        </div>
      </div>
      <div className={`${styles.layer} ${styles.flash}`} style={{ opacity: clamp(flash, 0, 1) }} />
    </div>
  );
}
