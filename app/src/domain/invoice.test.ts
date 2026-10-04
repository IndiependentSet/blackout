import { describe, expect, it } from 'vitest';
import { shareText } from './invoice';
import { scoreRun } from './scoring';

describe('shareText', () => {
  it('renders glyphs, grades and total', () => {
    const a = scoreRun({ stars: 1, k: 2 }, 2), b = scoreRun({ stars: 2, k: 3 }, 4);
    expect(shareText(7, [a, b, null])).toBe('CATASTROPHE INC. #7\n🐾⬜⬜\nSB–  25 pts');
  });
});
