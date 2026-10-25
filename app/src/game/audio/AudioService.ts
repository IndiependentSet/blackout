import { CRACKLES } from '../../assets/sfx';

/** Recorded takes are normalised hot; this sits them alongside the synthesised chirps and crashes. */
const CRACKLE_GAIN = 0.3;

type Ctor = typeof AudioContext;

/** When the telescope's slew does each thing, in seconds from now (the theme's timeline, at its pace). */
export interface SlewBeats {
  /** the view starts moving */
  move: number;
  /** it has arrived and the focus is being racked */
  focus: number;
  /** the sky is sharp and the eyepiece opens */
  sharp: number;
}

/** White noise `dur` seconds long, shaped by `env` (0..1 through the buffer). */
function noiseBuffer(ac: AudioContext, dur: number, env: (x: number) => number): AudioBuffer {
  const buf = ac.createBuffer(1, Math.max(1, Math.round(ac.sampleRate * dur)), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * env(i / d.length);
  return buf;
}

export interface AudioOptions {
  enabled?: boolean;
  crackleUrls?: string[];
  /** injectable for tests */
  createContext?: () => AudioContext | null;
}

/* Game sound: crackle on hire, chirp on recall, crash on smash, fanfare on a
   clear, and the telescope slewing between skies. All but the crackles are
   synthesised in the Web Audio graph; the crackles are recordings. The
   context is built lazily and left suspended — nothing is ever started before
   a tap — so the takes are decoded and waiting by the time the first cat is
   hired. */
export class AudioService {
  private readonly enabled: boolean;
  private readonly crackleUrls: string[];
  private readonly createContext: () => AudioContext | null;
  private ac: AudioContext | null = null;
  private crackles: (AudioBuffer | undefined)[] | null = null;

  constructor({ enabled = true, crackleUrls = CRACKLES, createContext }: AudioOptions = {}) {
    this.enabled = enabled;
    this.crackleUrls = crackleUrls;
    this.createContext = createContext ?? (() => {
      const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
      const C = w.AudioContext || w.webkitAudioContext;
      return C ? new C() : null;
    });
  }

  private context(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ac) this.ac = this.createContext();
    return this.ac;
  }

  /** The context, resumed: only called from a gesture. */
  private awake(): AudioContext | null {
    const ac = this.context();
    if (ac && ac.state === 'suspended') void ac.resume();
    return ac;
  }

  /** Start decoding the recorded takes so the first hire already has them. */
  preload(): void {
    if (!this.enabled || this.crackles) return;
    const slots: (AudioBuffer | undefined)[] = [];
    this.crackles = slots;
    this.crackleUrls.forEach((url, i) => fetch(url)
      .then(r => r.arrayBuffer())
      .then(bytes => { const ac = this.context(); return ac ? ac.decodeAudioData(bytes) : undefined; })
      .then(buf => { if (buf) slots[i] = buf; })
      .catch(() => { /* a take that won't load is just a silent one */ }));
  }

  /* The sound of a cat hitting a pad: one of the recorded takes, chosen at
     random so a run of deployments doesn't turn into a loop. Deliberately not
     used when a cat is recalled — putting one down and taking one back should
     never sound the same. Returns false if nothing has decoded yet, so the
     caller can fall back to the synthesised chirp rather than play silence. */
  crackle(): boolean {
    const ac = this.awake(); if (!ac) return false;
    this.preload();
    const ready = (this.crackles ?? []).filter((b): b is AudioBuffer => !!b);
    if (!ready.length) return false;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = ready[(Math.random() * ready.length) | 0];
    g.gain.value = CRACKLE_GAIN;
    src.connect(g); g.connect(ac.destination);
    src.start(ac.currentTime);
    return true;
  }

  /** A short blip: rising when a cat is hired (no recording yet), falling when one is recalled. */
  chirp(n: number, up: boolean): void {
    const ac = this.awake(); if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'triangle';
    const base = 330 * Math.pow(1.0595, Math.max(0, (n - 1) * 2));
    o.frequency.setValueAtTime(up ? base * 0.7 : base, t);
    o.frequency.exponentialRampToValueAtTime(up ? base * 1.6 : base * 0.55, t + 0.12);
    f.type = 'lowpass'; f.frequency.value = 4200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(f); f.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + 0.36);
  }

  /** The noise of `count` fixtures going at once. */
  crash(count: number): void {
    const ac = this.awake(); if (!ac || !count) return;
    const t = ac.currentTime;
    const buf = noiseBuffer(ac, 0.28, x => Math.pow(1 - x, 2.4));
    const src = ac.createBufferSource(), g = ac.createGain(), hp = ac.createBiquadFilter();
    src.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 1400;
    g.gain.value = Math.min(0.13, 0.05 + count * 0.02);
    src.connect(hp); hp.connect(g); g.connect(ac.destination); src.start(t);
  }

  /** Four rising square-wave notes: the site is clear. */
  fanfare(): void {
    const ac = this.awake(); if (!ac) return;
    const t0 = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => {
      const t = t0 + i * 0.09;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(hz, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.085, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.46);
    });
  }

  /* The telescope slewing to the next sky: the eyepiece clicks shut, the mount's motor whirs up and down with the
     swing under a soft rush of air, the focus knob ticks as the sky is racked in, and a quiet bell rings as it lands
     sharp. Everything runs through one bus, so the returned stop (a tap that skips the slew, leaving the screen) can
     fade it all out at once; calling it again does nothing. */
  slew({ move, focus, sharp }: SlewBeats): () => void {
    const ac = this.awake(); if (!ac) return () => {};
    const t0 = ac.currentTime;
    const bus = ac.createGain();
    bus.gain.value = 1;
    bus.connect(ac.destination);
    const sources: AudioScheduledSourceNode[] = [];
    const play = (src: AudioScheduledSourceNode, at: number, until: number) => { src.start(t0 + at); src.stop(t0 + until); sources.push(src); };
    /** a gain that rises from silence to `peak` at `top` and falls back by `end` */
    const swell = (start: number, top: number, end: number, peak: number) => {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(peak, t0 + top);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + end);
      g.connect(bus);
      return g;
    };

    /* the eyepiece closing: a low thump with a small click on top */
    const thump = ac.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(150, t0);
    thump.frequency.exponentialRampToValueAtTime(65, t0 + 0.12);
    thump.connect(swell(0, 0.008, 0.16, 0.12));
    play(thump, 0, 0.18);
    const click = ac.createBufferSource(), clickHp = ac.createBiquadFilter();
    click.buffer = noiseBuffer(ac, 0.02, x => 1 - x);
    clickHp.type = 'highpass'; clickHp.frequency.value = 2600;
    click.connect(clickHp); clickHp.connect(swell(0, 0.002, 0.03, 0.05));
    play(click, 0, 0.03);

    /* the motor: two detuned buzzes under a lowpass, pitched by how fast the mount is turning */
    const mid = (move + focus) / 2;
    const motorLp = ac.createBiquadFilter();
    motorLp.type = 'lowpass'; motorLp.frequency.value = 900;
    motorLp.connect(swell(move, mid, focus + 0.05, 0.04));
    ([['sawtooth', 1], ['triangle', 1.51]] as const).forEach(([type, k]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(70 * k, t0 + move);
      o.frequency.exponentialRampToValueAtTime(175 * k, t0 + mid);
      o.frequency.exponentialRampToValueAtTime(70 * k, t0 + focus);
      o.connect(motorLp);
      play(o, move, focus + 0.08);
    });

    /* the sky rushing past: noise through a band that sweeps up and back */
    const air = ac.createBufferSource(), band = ac.createBiquadFilter();
    air.buffer = noiseBuffer(ac, focus - move + 0.1, () => 1);
    band.type = 'bandpass'; band.Q.value = 0.9;
    band.frequency.setValueAtTime(380, t0 + move);
    band.frequency.exponentialRampToValueAtTime(1700, t0 + mid);
    band.frequency.exponentialRampToValueAtTime(520, t0 + focus);
    air.connect(band); band.connect(swell(move, mid, focus + 0.05, 0.1));
    play(air, move, focus + 0.1);

    /* the focus knob: three small ticks while the sky is racked in */
    [0, 0.3, 0.55].forEach((k, i) => {
      const at = focus + (sharp - focus) * k;
      const o = ac.createOscillator();
      o.type = 'triangle'; o.frequency.setValueAtTime(2300 + i * 140, t0 + at);
      o.connect(swell(at, at + 0.004, at + 0.03, 0.03));
      play(o, at, at + 0.04);
    });

    /* sharp: a soft two-note bell with a faint octave above */
    ([[1318.5, 0, 0.035], [1975.5, 0.06, 0.03], [2637, 0.06, 0.01]] as const).forEach(([hz, delay, peak]) => {
      const at = sharp + delay;
      const o = ac.createOscillator();
      o.type = 'sine'; o.frequency.setValueAtTime(hz, t0 + at);
      o.connect(swell(at, at + 0.01, at + 1.1, peak));
      play(o, at, at + 1.15);
    });

    /* the bell rings last: once it has, the bus goes too */
    sources[sources.length - 1].onended = () => bus.disconnect();

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      const now = ac.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + 0.08);
      for (const src of sources) { try { src.stop(now + 0.1); } catch { /* already stopped */ } }
    };
  }

  /** The tick as each line of the score card lands. */
  tick(i: number): void {
    const ac = this.awake(); if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(620 + i * 90, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.16);
  }
}

/** The one sound engine for the app; it builds its context on first use. */
export const audio = new AudioService();
