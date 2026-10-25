import { describe, expect, it, vi } from 'vitest';
import { AudioService } from './AudioService';

function fakeContext() {
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), value: 0 });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null, frequency: param(), gain: param(), Q: param() });
  return {
    state: 'suspended', currentTime: 0, sampleRate: 8000, destination: {},
    resume: vi.fn(), createOscillator: vi.fn(node), createGain: vi.fn(node), createBiquadFilter: vi.fn(node),
    createBufferSource: vi.fn(node),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(10) })),
    decodeAudioData: vi.fn(),
  };
}

describe('AudioService', () => {
  it('stays silent and builds no context when disabled', () => {
    const create = vi.fn();
    const a = new AudioService({ enabled: false, createContext: create });
    a.chirp(1, true); a.fanfare(); a.crash(3);
    expect(a.crackle()).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it('copes with a browser that has no Web Audio', () => {
    const a = new AudioService({ createContext: () => null });
    expect(() => { a.chirp(1, false); a.tick(2); a.crash(1); a.fanfare(); }).not.toThrow();
    expect(a.crackle()).toBe(false);
  });

  it('wakes a suspended context on first sound', () => {
    const ctx = fakeContext();
    new AudioService({ createContext: () => ctx as unknown as AudioContext }).chirp(2, true);
    expect(ctx.resume).toHaveBeenCalled();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
  });

  it('plays nothing for a crash of zero fixtures', () => {
    const ctx = fakeContext();
    new AudioService({ createContext: () => ctx as unknown as AudioContext }).crash(0);
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
  });

  it('reports false (so the caller can chirp) until a crackle has decoded', () => {
    const ctx = fakeContext();
    const a = new AudioService({ createContext: () => ctx as unknown as AudioContext, crackleUrls: [] });
    expect(a.crackle()).toBe(false);
  });

  it('plays a decoded crackle', async () => {
    const ctx = fakeContext();
    const buf = {} as AudioBuffer;
    ctx.decodeAudioData.mockResolvedValue(buf);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)) }));
    const a = new AudioService({ createContext: () => ctx as unknown as AudioContext, crackleUrls: ['x.wav'] });
    a.preload();
    await vi.waitFor(() => expect(a.crackle()).toBe(true));
    vi.unstubAllGlobals();
  });

  it('slews in time with the beats it is given, and its stop fades everything once', () => {
    const ctx = fakeContext();
    const stop = new AudioService({ createContext: () => ctx as unknown as AudioContext }).slew({ move: 0.3, focus: 1.05, sharp: 1.45 });
    const sources = [...ctx.createOscillator.mock.results, ...ctx.createBufferSource.mock.results].map(r => r.value);
    const starts = sources.map(s => s.start.mock.calls[0][0] as number);
    expect(Math.min(...starts)).toBe(0);
    expect(Math.max(...starts)).toBeCloseTo(1.51);   // the bell's second note, just after sharp
    const bus = ctx.createGain.mock.results[0].value;
    expect(bus.connect).toHaveBeenCalledWith(ctx.destination);
    stop(); stop();
    expect(bus.gain.linearRampToValueAtTime).toHaveBeenCalledTimes(1);
    expect(sources.every(s => s.stop.mock.calls.length === 2)).toBe(true);
  });

  it('a slew is silent, and stopping it harmless, without Web Audio', () => {
    expect(() => new AudioService({ createContext: () => null }).slew({ move: 0.3, focus: 1, sharp: 1.4 })()).not.toThrow();
  });
});
