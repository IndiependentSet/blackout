import { describe, expect, it } from 'vitest';
import type { SiteResult } from '../../../../domain/types';
import { tonightState } from './tonight';

const r = (status: 'perfect' | 'over') => ({ status }) as SiteResult;

describe('tonightState', () => {
  it('opens the sky on the board while it is dark, else the first dark one', () => {
    expect(tonightState([null, null, null], 0)).toMatchObject({ charted: 0, next: 0, done: false });
    expect(tonightState([r('perfect'), null, null], 0)).toMatchObject({ charted: 1, atPar: 1, next: 1 });
    expect(tonightState([r('perfect'), null, r('over')], 2)).toMatchObject({ next: 1, atPar: 1 });
  });
  it('is done once every sky is charted', () => {
    expect(tonightState([r('perfect'), r('over')], 1)).toMatchObject({ done: true, charted: 2, atPar: 1 });
  });
});
