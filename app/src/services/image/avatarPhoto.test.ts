import { describe, expect, it } from 'vitest';
import { centreSquare } from './avatarPhoto';

describe('centreSquare', () => {
  it('crops the sides of a landscape picture', () => expect(centreSquare(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 }));
  it('crops the top and bottom of a portrait one', () => expect(centreSquare(200, 400)).toEqual({ sx: 0, sy: 100, side: 200 }));
  it('keeps a square whole', () => expect(centreSquare(300, 300)).toEqual({ sx: 0, sy: 0, side: 300 }));
});
