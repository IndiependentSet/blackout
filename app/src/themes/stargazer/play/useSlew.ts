import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Level } from '../../../domain/types';
import { audio } from '../../../game/audio/AudioService';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { advance, fieldStars, isOver, slewBeats, slewFrame, slewHeading, TOTAL, type FieldStar, type Heading, type Pace, type SlewFrame } from './slew';

/** A sky as it was last on the board. */
export interface Shown { level: Level; placed: number[]; slot: number }

/** One slew under way: the sky it leaves, which way it goes, and the board's size when it started. */
export interface SlewRun { from: Shown; heading: Heading; w: number; h: number; field: FieldStar[] }

export interface Slew { run: SlewRun; frame: SlewFrame }

/* Notices the board moving on to another sky (`slot` changes, wherever the new level came from) and plays the slew
   from the one last shown. It starts in a layout effect, before the new sky is ever painted still. No slew for the
   first sky on a screen, for a board with no size (tests), or for someone who prefers reduced motion. */
export function useSlew(level: Level | null, placed: number[], slot: number, pace: Pace, stage: RefObject<HTMLElement | null>): { slew: Slew | null; skip: () => void } {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const last = useRef<Shown | null>(null);
  const [run, setRun] = useState<SlewRun | null>(null);
  const [T, setT] = useState(0);

  useLayoutEffect(() => {
    if (!level) return;
    const prev = last.current;
    last.current = { level, placed, slot };
    if (!prev || prev.slot === slot || reduced) return;
    const box = stage.current?.getBoundingClientRect();
    if (!box || box.width < 1 || box.height < 1) return;
    setRun({ from: prev, heading: slewHeading(slot, slot < prev.slot), w: box.width, h: box.height, field: fieldStars(slot) });
    setT(0);
  }, [level, placed, slot, reduced, stage]);

  /* the clock runs only while a slew is under way; a finished run is simply left behind until the next */
  const running = run !== null && !isOver(T);
  useEffect(() => {
    if (!running) return;
    let id = 0;
    let then: number | null = null;
    const tick = (now: number) => {
      const dt = then === null ? 0 : Math.min(0.1, (now - then) / 1000);
      then = now;
      setT(t => advance(t, dt, pace));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, pace]);

  /* its sound, from the start of each run; a skip or leaving the screen cuts it short */
  const hush = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!run) return;
    const stop = audio.slew(slewBeats(pace));
    hush.current = stop;
    return () => { stop(); hush.current = null; };
  }, [run, pace]);

  const skip = useCallback(() => { hush.current?.(); setT(TOTAL); }, []);
  return { slew: run && running ? { run, frame: slewFrame(T) } : null, skip };
}
