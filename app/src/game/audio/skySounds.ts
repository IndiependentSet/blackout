/* Stargazer's sounds: a star lit, a star dimmed, a figure complete, the telescope out of power, and the telescope slewing between skies.
   They play through a small echo (`spaceBus`), so they ring out as if in open space. */
import { noiseBuffer, play, swell, take, tone, type Take } from './synth';

/** When the telescope's slew does each thing, in seconds from now (the theme's timeline, at its pace). */
export interface SlewBeats {
  /** the view starts moving */
  move: number;
  /** it has arrived and the focus is being racked */
  focus: number;
  /** the sky is sharp and the eyepiece opens */
  sharp: number;
}

/** The dry signal plus a soft, darkening echo, straight to the speakers. Build it once per context. */
export function spaceBus(ac: AudioContext): AudioNode {
  const input = ac.createGain();
  const delay = ac.createDelay(1), loop = ac.createGain(), dark = ac.createBiquadFilter(), wet = ac.createGain();
  delay.delayTime.value = 0.23;
  loop.gain.value = 0.38;
  dark.type = 'lowpass'; dark.frequency.value = 2400;
  wet.gain.value = 0.32;
  input.connect(ac.destination);
  input.connect(delay); delay.connect(dark); dark.connect(loop); loop.connect(delay);
  dark.connect(wet); wet.connect(ac.destination);
  return input;
}

/** Major pentatonic from G4: whatever order the stars are lit in, the notes never clash. */
const PENTATONIC = [0, 2, 4, 7, 9];
const ROOT = 392;
/** The note of the `n`th lit star: each one a step up, two and a half octaves, then round again. */
export function starNote(n: number): number {
  const i = (Math.max(1, n) - 1) % 12;
  const semis = 12 * Math.floor(i / PENTATONIC.length) + PENTATONIC[i % PENTATONIC.length];
  return ROOT * Math.pow(2, semis / 12);
}

/** A star lit: a glassy bell (a few inharmonic partials) on the `n`th star's note, with a little sparkle above it. */
export function twinkle(ac: AudioContext, out: AudioNode, n: number): void {
  const t = take(ac, out), f = starNote(n);
  ([[1, 0.075, 1.3], [2, 0.03, 0.8], [2.76, 0.018, 0.5], [5.4, 0.007, 0.25]] as const)
    .forEach(([k, peak, decay]) => tone(t, 'sine', f * k, 0, 0.004, decay, peak));
  [4, 6, 8].forEach((k, i) => tone(t, 'sine', f * k, 0.03 + i * 0.028, 0.003, 0.12, 0.009));
}

/** A star dimmed: the `n`th star's note sinking an octave and fading behind a closing filter. */
export function fade(ac: AudioContext, out: AudioNode, n: number): void {
  const t = take(ac, out), f = starNote(n);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3200, t.t0);
  lp.frequency.exponentialRampToValueAtTime(420, t.t0 + 0.4);
  lp.connect(swell(t, 0, 0.015, 0.5, 0.06));
  (['sine', 'triangle'] as const).forEach((type, i) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f * (i ? 1.003 : 1), t.t0);
    o.frequency.exponentialRampToValueAtTime(f / 2, t.t0 + 0.4);
    o.connect(lp);
    play(t, o, 0, 0.52);
  });
}

/** How many of the figure's notes the completion runs up through, at most. */
const RUN_NOTES = 8;
/** The chord a finished figure blooms into: G major with the sixth and ninth, all inside the stars' scale. */
const BLOOM = [392, 493.88, 587.33, 659.25, 880];

/* A figure complete: the stars' notes run up quickly, one bell each, then bloom into a soft, slow chord over a low
   swell, with glitter scattered above it as it fades into the echo. Replaces the old fanfare in Stargazer. */
export function constellation(ac: AudioContext, out: AudioNode, n: number): void {
  const t = take(ac, out);
  const run = Math.max(1, Math.min(n, RUN_NOTES));
  for (let i = 1; i <= run; i++) {
    const at = (i - 1) * 0.07, f = starNote(i);
    tone(t, 'sine', f, at, 0.004, 0.6, 0.04);
    tone(t, 'sine', f * 2.76, at, 0.003, 0.2, 0.008);
  }
  const bloom = (run - 1) * 0.07 + 0.09;

  /* the chord: each note a sine and a slightly detuned triangle, under a filter that opens as it swells */
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t.t0 + bloom);
  lp.frequency.exponentialRampToValueAtTime(3800, t.t0 + bloom + 0.5);
  lp.connect(t.out);
  BLOOM.forEach(f => {
    tone(t, 'sine', f, bloom, 0.28, 2.2, 0.022, lp);
    tone(t, 'triangle', f * 1.004, bloom, 0.32, 2, 0.012, lp);
  });
  tone(t, 'sine', 196, bloom, 0.25, 1.9, 0.05);

  /* glitter: tiny high notes of the scale, scattered as the chord rings */
  for (let i = 0; i < 9; i++) {
    const at = bloom + 0.12 + Math.random() * 1.4;
    tone(t, 'sine', starNote(1 + Math.floor(Math.random() * 10)) * 4, at, 0.003, 0.18, 0.006 + Math.random() * 0.006);
  }
}

/** The telescope out of power: a low, muffled hum that sags. */
export function fizzle(ac: AudioContext, out: AudioNode): void {
  const t = take(ac, out);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 520;
  lp.connect(swell(t, 0, 0.02, 0.28, 0.06));
  [150, 153.5].forEach(hz => {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(hz, t.t0);
    o.frequency.exponentialRampToValueAtTime(hz * 0.62, t.t0 + 0.26);
    o.connect(lp);
    play(t, o, 0, 0.3);
  });
}

/* The telescope slewing to the next sky: the eyepiece clicks shut, the mount's motor whirs up and down with the swing
   under a soft rush of air, the focus knob ticks as the sky is racked in, and a quiet bell rings as it lands sharp.
   Everything runs through one bus, so the returned stop (a tap that skips the slew, leaving the screen) can fade it
   all out at once; calling it again does nothing. */
export function slew(ac: AudioContext, out: AudioNode, { move, focus, sharp }: SlewBeats): () => void {
  const bus = ac.createGain();
  bus.gain.value = 1;
  bus.connect(out);
  const t: Take = take(ac, bus);
  const { t0 } = t;

  /* the eyepiece closing: a low thump with a small click on top */
  const thump = ac.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(150, t0);
  thump.frequency.exponentialRampToValueAtTime(65, t0 + 0.12);
  thump.connect(swell(t, 0, 0.008, 0.16, 0.12));
  play(t, thump, 0, 0.18);
  const click = ac.createBufferSource(), clickHp = ac.createBiquadFilter();
  click.buffer = noiseBuffer(ac, 0.02, x => 1 - x);
  clickHp.type = 'highpass'; clickHp.frequency.value = 2600;
  click.connect(clickHp); clickHp.connect(swell(t, 0, 0.002, 0.03, 0.05));
  play(t, click, 0, 0.03);

  /* the motor: two detuned buzzes under a lowpass, pitched by how fast the mount is turning */
  const mid = (move + focus) / 2;
  const motorLp = ac.createBiquadFilter();
  motorLp.type = 'lowpass'; motorLp.frequency.value = 900;
  motorLp.connect(swell(t, move, mid, focus + 0.05, 0.04));
  ([['sawtooth', 1], ['triangle', 1.51]] as const).forEach(([type, k]) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(70 * k, t0 + move);
    o.frequency.exponentialRampToValueAtTime(175 * k, t0 + mid);
    o.frequency.exponentialRampToValueAtTime(70 * k, t0 + focus);
    o.connect(motorLp);
    play(t, o, move, focus + 0.08);
  });

  /* the sky rushing past: noise through a band that sweeps up and back */
  const air = ac.createBufferSource(), band = ac.createBiquadFilter();
  air.buffer = noiseBuffer(ac, focus - move + 0.1, () => 1);
  band.type = 'bandpass'; band.Q.value = 0.9;
  band.frequency.setValueAtTime(380, t0 + move);
  band.frequency.exponentialRampToValueAtTime(1700, t0 + mid);
  band.frequency.exponentialRampToValueAtTime(520, t0 + focus);
  air.connect(band); band.connect(swell(t, move, mid, focus + 0.05, 0.1));
  play(t, air, move, focus + 0.1);

  /* the focus knob: three small ticks while the sky is racked in */
  [0, 0.3, 0.55].forEach((k, i) => tone(t, 'triangle', 2300 + i * 140, focus + (sharp - focus) * k, 0.004, 0.026, 0.03));

  /* sharp: a soft two-note bell with a faint octave above */
  ([[1318.5, 0, 0.035], [1975.5, 0.06, 0.03], [2637, 0.06, 0.01]] as const)
    .forEach(([hz, delay, peak]) => tone(t, 'sine', hz, sharp + delay, 0.01, 1.09, peak));

  /* the bell rings last: once it has, the bus goes too */
  t.sources[t.sources.length - 1].onended = () => bus.disconnect();

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const now = ac.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0, now + 0.08);
    for (const src of t.sources) { try { src.stop(now + 0.1); } catch { /* already stopped */ } }
  };
}
