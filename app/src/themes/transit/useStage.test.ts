import { describe, expect, it } from 'vitest';
import { stageFor } from './useStage';

describe('stageFor', () => {
  it('fits a phone to the screen', () => expect(stageFor(390, 844, false).scale).toBeCloseTo(1, 6));
  it('shrinks a short phone by its height', () => expect(stageFor(390, 667, false).scale).toBeCloseTo(667 / 844, 6));
  it('stops growing the column at 560px wide', () => expect(stageFor(900, 2000, false).scale).toBeCloseTo(560 / 390, 6));
  it('keeps the desktop composition at its own size, or smaller to fit', () => {
    expect(stageFor(1440, 1200, true).scale).toBe(1);
    expect(stageFor(1440, 900, true).scale).toBeCloseTo(0.92 * 900 / 844, 6);
  });
});
