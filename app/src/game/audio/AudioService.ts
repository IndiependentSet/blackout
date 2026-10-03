import { CRACKLES } from '../../assets/sfx';

/** Recorded takes are normalised hot; this sits them alongside the synthesised chirps and crashes. */
const CRACKLE_GAIN = 0.3;

type Ctor = typeof AudioContext;

export interface AudioOptions {
  enabled?: boolean;
  crackleUrls?: string[];
  /** injectable for tests */
  createContext?: () => AudioContext | null;
}

/* Game sound: crackle on hire, chirp on recall, crash on smash, fanfare on a
   clear. Chirps, crashes and the fanfare are synthesised in the Web Audio
   graph; the crackles are recordings. The context is built lazily and left
   suspended — nothing is ever started before a tap — so the takes are decoded
   and waiting by the time the first cat is hired. */
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
    const t = ac.currentTime, dur = 0.28;
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.4);
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
