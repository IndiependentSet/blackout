import { describe, expect, it } from 'vitest';
import { trainingState } from './training';

describe('trainingState', () => {
  it('starts with an invitation to tap', () => {
    expect(trainingState([], 0)).toMatchObject({ smashed: 0, done: false, perfect: false, tone: 'neutral' });
  });
  it('is perfect with the hub and pad 4: two cats, five paths', () => {
    expect(trainingState([2, 4], 2)).toMatchObject({ smashed: 5, done: true, perfect: true, tone: 'good', note: 'HIRED! YOU’RE A NATURAL.' });
  });
  it('flags a clear that took too many cats', () => {
    const t = trainingState([0, 1, 3, 4], 4);
    expect(t).toMatchObject({ done: true, perfect: false, tone: 'bad' });
    expect(t.note).toBe('ALL SMASHED… BUT 2 CATS OVER BUDGET');
    expect(trainingState([2, 3, 5], 3).note).toBe('ALL SMASHED… BUT 1 CAT OVER BUDGET');
  });
  it('refuses to be over budget while paths remain', () => {
    expect(trainingState([0, 1, 5], 3)).toMatchObject({ done: false, tone: 'bad', note: 'PAYROLL SAYS NO — THAT’S OVER BUDGET' });
  });
  it('nudges toward the hub after a few taps without it', () => {
    expect(trainingState([0], 3)).toMatchObject({ pulse: 0, tone: 'hint' });
    expect(trainingState([0], 2).pulse).toBeUndefined();
    expect(trainingState([2], 5).pulse).toBeUndefined();
  });
});
