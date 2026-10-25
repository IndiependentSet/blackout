/* The small toolkit the synthesised sounds are built from: a "take" is one sound being scheduled on a context, from
   its start time, into one output, keeping the sources it starts so they can be cut short together. */

export interface Take {
  ac: AudioContext;
  /** when the sound starts, on the context's clock */
  t0: number;
  out: AudioNode;
  sources: AudioScheduledSourceNode[];
}

export const take = (ac: AudioContext, out: AudioNode): Take => ({ ac, t0: ac.currentTime, out, sources: [] });

/** Start `src` at `at` and stop it at `until`, both in seconds from the take's start. */
export function play(t: Take, src: AudioScheduledSourceNode, at: number, until: number): void {
  src.start(t.t0 + at);
  src.stop(t.t0 + until);
  t.sources.push(src);
}

/** A gain that rises from silence to `peak` at `top` and falls back to silence by `end`, into `into`. */
export function swell(t: Take, start: number, top: number, end: number, peak: number, into: AudioNode = t.out): GainNode {
  const g = t.ac.createGain();
  g.gain.setValueAtTime(0.0001, t.t0 + start);
  g.gain.exponentialRampToValueAtTime(peak, t.t0 + top);
  g.gain.exponentialRampToValueAtTime(0.0001, t.t0 + end);
  g.connect(into);
  return g;
}

/** One oscillator at `hz`, struck at `at`: up to `peak` in `attack`, gone `decay` later. */
export function tone(t: Take, type: OscillatorType, hz: number, at: number, attack: number, decay: number, peak: number, into?: AudioNode): OscillatorNode {
  const o = t.ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(hz, t.t0 + at);
  o.connect(swell(t, at, at + attack, at + attack + decay, peak, into));
  play(t, o, at, at + attack + decay + 0.02);
  return o;
}

/** White noise `dur` seconds long, shaped by `env` (0..1 through the buffer). */
export function noiseBuffer(ac: AudioContext, dur: number, env: (x: number) => number): AudioBuffer {
  const buf = ac.createBuffer(1, Math.max(1, Math.round(ac.sampleRate * dur)), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * env(i / d.length);
  return buf;
}
