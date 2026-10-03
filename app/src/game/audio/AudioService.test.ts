import { describe, expect, it, vi } from 'vitest';
import { AudioService } from './AudioService';

function fakeContext() {
  const node = () => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 } });
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
});
