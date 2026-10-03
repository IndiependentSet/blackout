import { PULSE_GROW, PULSE_MS, PULSE_N } from './constants';
import { prefersReducedMotion } from './env';
import { W_RIM } from '../sprites';

/* One-shot visual effects played on elements the board renders. They are
   Web Animations on elements looked up by the ids below — the single place
   that knows the ids — so a React render never has to restart them. */
export const WEB_ID = 'cc-web';
export const FLASH_ID = 'cc-flash';
export const bloomId = (node: number) => 'cc-bloom-' + node;

const play = (id: string, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
  const el = document.getElementById(id);
  if (el && el.animate) el.animate(keyframes, options);
};

/** A ring that blooms outward from a pad as a cat lands on it. */
export function bloom(node: number) {
  requestAnimationFrame(() => play(bloomId(node),
    [{ r: '8px', opacity: 0.9, strokeWidth: 5 }, { r: '44px', opacity: 0, strokeWidth: 0.6 }] as unknown as Keyframe[],
    { duration: 620, easing: 'cubic-bezier(.1,.8,.2,1)' }));
}

/* One sweep of the whole web when a site opens, or when the crew is recalled
   and the board goes unlit again: the puzzle announces itself against the room
   art while the establishing shot still has all of it in frame. */
export function pulseWeb() {
  if (prefersReducedMotion()) return;
  requestAnimationFrame(() => play(WEB_ID,
    [{ strokeWidth: W_RIM, opacity: .8 }, { strokeWidth: W_RIM * PULSE_GROW, opacity: 1, offset: .5 }, { strokeWidth: W_RIM, opacity: .8 }],
    { duration: PULSE_MS, iterations: PULSE_N, easing: 'ease-in-out' }));
}

/** A white-pink flash over the whole screen when a site is cleared. */
export function flashScreen() {
  play(FLASH_ID, [{ opacity: 0.55 }, { opacity: 0.55, offset: 0.16 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' });
}
