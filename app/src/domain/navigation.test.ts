import { describe, expect, it } from 'vitest';
import { isDirection, nearestInDirection } from './navigation';

const nodes = [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 1, r: 2 }];

describe('nearestInDirection', () => {
  it('moves to the nearest node ahead', () => expect(nearestInDirection(nodes, 0, 'ArrowRight')).toBe(1));
  it('prefers staying on-axis', () => expect(nearestInDirection(nodes, 1, 'ArrowDown')).toBe(3));
  it('returns -1 when nothing lies that way', () => expect(nearestInDirection(nodes, 0, 'ArrowLeft')).toBe(-1));
  it('recognises arrow keys', () => { expect(isDirection('ArrowUp')).toBe(true); expect(isDirection('a')).toBe(false); });
});
