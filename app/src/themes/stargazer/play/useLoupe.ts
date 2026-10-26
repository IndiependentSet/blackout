import { useEffect, useReducer, useRef, type MouseEvent, type PointerEvent } from 'react';
import { HOLD_MS, SLOP_PX, type Pt } from './loupe';

/** Where the finger is: px within the board (for the eyepiece) and in the sky's own units (for what it shows). */
export interface Touch { finger: Pt; world: Pt }

type State =
  | { kind: 'idle' }
  /** a finger is down and still: if it stays, the loupe opens */
  | { kind: 'press'; id: number; client: Pt; touch: Touch }
  | { kind: 'open'; id: number; touch: Touch };

type Action =
  | { type: 'down'; id: number; client: Pt; touch: Touch }
  | { type: 'move'; id: number; client: Pt; touch: Touch }
  | { type: 'hold' }
  | { type: 'end' };

export function loupeReducer(s: State, a: Action): State {
  switch (a.type) {
    case 'down': return s.kind === 'idle' ? { kind: 'press', id: a.id, client: a.client, touch: a.touch } : s;
    case 'move':
      if (s.kind === 'idle' || a.id !== s.id) return s;
      if (s.kind === 'open') return { ...s, touch: a.touch };
      /* a finger that wanders before the hold is a tap or a slip, not a hold */
      return Math.hypot(a.client.x - s.client.x, a.client.y - s.client.y) > SLOP_PX ? { kind: 'idle' } : s;
    case 'hold': return s.kind === 'press' ? { kind: 'open', id: s.id, touch: s.touch } : s;
    case 'end': return s.kind === 'idle' ? s : { kind: 'idle' };
  }
}

/** a click this soon after the loupe lit a star is that same touch: swallowed, so the star isn't tapped twice */
const SWALLOW_MS = 450;

/** Press and hold on the board (touch or pen, and only when `enabled`) opens the loupe; sliding moves it; lifting
    calls `onPick` with where the finger was. A quick tap is left to the board's own click. */
export function useLoupe(svg: SVGSVGElement | null, enabled: boolean, onPick: (touch: Touch) => void) {
  const [state, dispatch] = useReducer(loupeReducer, { kind: 'idle' });
  const swallowUntil = useRef(0);

  /* the hold: only while a finger is down and still */
  const pressing = state.kind === 'press';
  useEffect(() => {
    if (!pressing) return;
    const t = setTimeout(() => dispatch({ type: 'hold' }), HOLD_MS);
    return () => clearTimeout(t);
  }, [pressing]);

  /* turned off mid-press (a slew, the sky changing size): let go */
  useEffect(() => { if (!enabled) dispatch({ type: 'end' }); }, [enabled]);

  const touchAt = (e: PointerEvent): Touch | null => {
    if (!svg) return null;
    const m = svg.getScreenCTM?.();
    if (!m) return null;
    const r = svg.getBoundingClientRect();
    const k = m.inverse(), x = e.clientX, y = e.clientY;
    return { finger: { x: x - r.left, y: y - r.top }, world: { x: k.a * x + k.c * y + k.e, y: k.b * x + k.d * y + k.f } };
  };

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (!enabled || e.pointerType === 'mouse' || !e.isPrimary) return;
      const touch = touchAt(e);
      if (touch) dispatch({ type: 'down', id: e.pointerId, client: { x: e.clientX, y: e.clientY }, touch });
    },
    onPointerMove: (e: PointerEvent) => {
      if (state.kind === 'idle') return;
      const touch = touchAt(e);
      if (touch) dispatch({ type: 'move', id: e.pointerId, client: { x: e.clientX, y: e.clientY }, touch });
    },
    onPointerUp: (e: PointerEvent) => {
      if (state.kind === 'idle' || e.pointerId !== state.id) return;
      if (state.kind === 'open') {
        swallowUntil.current = e.timeStamp + SWALLOW_MS;
        onPick(touchAt(e) ?? state.touch);
      }
      dispatch({ type: 'end' });
    },
    onPointerCancel: () => dispatch({ type: 'end' }),
    onClickCapture: (e: MouseEvent) => {
      if (e.timeStamp > swallowUntil.current) return;
      swallowUntil.current = 0;
      e.stopPropagation();
      e.preventDefault();
    },
    /* a long press would otherwise open the browser's menu over the loupe */
    onContextMenu: (e: MouseEvent) => { if (state.kind !== 'idle') e.preventDefault(); },
  };

  return { open: state.kind === 'open' ? state.touch : null, handlers };
}
