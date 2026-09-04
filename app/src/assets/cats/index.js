/*
 * Cats cut from the CAT COVER sticker sheet.
 *
 * Every breed ships three poses on a shared 192x192 canvas: the cats all sit
 * at the same scale with their feet on the same baseline (y = 182), so a node
 * can swap poses without the cat jumping around. `sleep` is the calm cat;
 * `wakeA`/`wakeB` flip back and forth while the cat is out causing chaos.
 */
import whiskersSleep from './whiskers-sleep.png';
import whiskersWakeA from './whiskers-wakeA.png';
import whiskersWakeB from './whiskers-wakeB.png';
import ninjaSleep from './ninja-sleep.png';
import ninjaWakeA from './ninja-wakeA.png';
import ninjaWakeB from './ninja-wakeB.png';
import fluffSleep from './fluff-sleep.png';
import fluffWakeA from './fluff-wakeA.png';
import fluffWakeB from './fluff-wakeB.png';
import chaosSleep from './chaos-sleep.png';
import chaosWakeA from './chaos-wakeA.png';
import chaosWakeB from './chaos-wakeB.png';
import troubleSleep from './trouble-sleep.png';
import troubleWakeA from './trouble-wakeA.png';
import troubleWakeB from './trouble-wakeB.png';
import divaSleep from './diva-sleep.png';
import divaWakeA from './diva-wakeA.png';
import divaWakeB from './diva-wakeB.png';

/* where the cats' feet sit on the sprite canvas, as a fraction of its side */
export const CAT_BASELINE = 182 / 192;

export const BREEDS = [
  { name: 'MR. WHISKERS', sleep: whiskersSleep, wakeA: whiskersWakeA, wakeB: whiskersWakeB },
  { name: 'NINJA', sleep: ninjaSleep, wakeA: ninjaWakeA, wakeB: ninjaWakeB },
  { name: 'PRINCESS FLUFF', sleep: fluffSleep, wakeA: fluffWakeA, wakeB: fluffWakeB },
  { name: 'CHAOS', sleep: chaosSleep, wakeA: chaosWakeA, wakeB: chaosWakeB },
  { name: 'TROUBLE', sleep: troubleSleep, wakeA: troubleWakeA, wakeB: troubleWakeB },
  { name: 'DIVA', sleep: divaSleep, wakeA: divaWakeA, wakeB: divaWakeB },
];
