import { describe, expect, it } from 'vitest';
import { canSkip, choose, CUES, END_IDLE, HOLD_AT, IDLE_SLIP, isOver, skip, startClock, tick, TOTAL } from './timeline';

const run = (c: ReturnType<typeof startClock>, seconds: number, dt = 0.05) => {
  for (let t = 0; t < seconds; t += dt) c = tick(c, dt);
  return c;
};

describe('the clock', () => {
  it('starts after the seventh tap', () => expect(startClock().T).toBe(1.9));

  it('waits at the console for a button', () => {
    const c = run(startClock(), 3);
    expect(c.T).toBeCloseTo(HOLD_AT, 6);
    expect(c.branch).toBeNull();
  });

  it('presses the wrong button after the idle time', () => {
    const c = run(startClock(), 3 + IDLE_SLIP + 0.2);
    expect(c.branch).toBe('slip');
  });

  it('carries on to the end after a choice, and rests there', () => {
    let c = choose(run(startClock(), 3), 'autopilot');
    c = run(c, 20);
    expect(c.T).toBe(TOTAL);
    expect(c.branch).toBe('autopilot');
    expect(isOver(c)).toBe(c.rest >= END_IDLE);
    expect(isOver(run(c, END_IDLE + 0.2))).toBe(true);
  });

  it('keeps the first choice', () => {
    const c = choose(choose(startClock(), 'autopilot'), 'slip');
    expect(c.branch).toBe('autopilot');
  });
});

describe('skipping', () => {
  it('is not offered before the console is up or on the last frame', () => {
    expect(canSkip(1.9)).toBe(false);
    expect(canSkip(CUES.Boarding + 0.5)).toBe(false);
    expect(canSkip(CUES.Boarding + 1)).toBe(true);
    expect(canSkip(CUES.Hired)).toBe(false);
  });

  it('jumps from the tunnel to the last frame', () => {
    const c = skip({ T: CUES.Wormhole + 1, branch: 'autopilot', held: 0, rest: 0 });
    expect(c.T).toBe(CUES.Hired);
    expect(c.branch).toBe('autopilot');
  });

  it('presses the wrong button for a player who skipped from the console', () => {
    expect(skip({ T: CUES.Boarding + 1.2, branch: null, held: 0, rest: 0 }).branch).toBe('slip');
  });

  it('leaves the clock alone when it cannot skip', () => {
    const c = startClock();
    expect(skip(c)).toBe(c);
  });
});
