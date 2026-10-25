import { describe, expect, it } from 'vitest';
import { advance, CUES, fieldStars, isOver, slewBeats, slewDistance, slewFrame, slewHeading, TOTAL } from './slew';

describe('slewFrame', () => {
  it('starts and ends on the board as it is: no eyepiece, the new sky centred, sharp and whole', () => {
    const start = slewFrame(0);
    expect(start.shut).toBe(0);
    expect(start.travel).toBe(0);
    expect(start.outgoing).toBe(1);
    const end = slewFrame(TOTAL);
    expect(end.shut).toBe(0);
    expect(end.travel).toBeCloseTo(1, 3);
    expect(end.blur).toBeCloseTo(0, 6);
    expect(end.zoom).toBe(1);
    expect(end.incoming).toBe(1);
    expect(end.ring).toBe(1);
  });

  it('closes down to the eyepiece before it moves, and moves fastest halfway', () => {
    const closed = slewFrame(CUES.slew);
    expect(closed.shut).toBe(1);
    expect(closed.ring).toBeLessThan(1);
    expect(closed.travel).toBe(0);
    const mid = slewFrame((CUES.slew + CUES.focus) / 2);
    expect(mid.travel).toBeCloseTo(0.5, 6);
    expect(mid.speed).toBeCloseTo(1, 6);
    expect(slewFrame(CUES.slew + 0.1).speed).toBeLessThan(mid.speed);
  });

  it('brings the new sky in out of focus and racks it sharp, past and back', () => {
    expect(slewFrame(CUES.slew + 0.2).blur).toBeGreaterThan(2);
    const racked = Array.from({ length: 41 }, (_, i) => slewFrame(CUES.focus + (i / 40) * (CUES.open - CUES.focus)).blur);
    const sharpest = racked.indexOf(Math.min(...racked));
    expect(racked[sharpest]).toBeLessThan(0.05);
    expect(Math.max(...racked.slice(sharpest))).toBeGreaterThan(0.5);   // hunts past sharp
    expect(racked[racked.length - 1]).toBeLessThan(0.01);
  });

  it('holds either side of the clock', () => {
    expect(slewFrame(-1)).toEqual(slewFrame(0));
    expect(slewFrame(TOTAL + 5)).toEqual(slewFrame(TOTAL));
  });
});

describe('the slew clock', () => {
  it('runs twice as fast in a hurry and stops at the end', () => {
    expect(advance(0, 0.5, 'full')).toBeCloseTo(0.5);
    expect(advance(0, 0.5, 'brisk')).toBeCloseTo(1);
    expect(advance(TOTAL - 0.1, 1, 'full')).toBe(TOTAL);
    expect(isOver(TOTAL)).toBe(true);
    expect(isOver(TOTAL - 0.01)).toBe(false);
  });

  it('times the sound to the beats, at the pace', () => {
    expect(slewBeats('full')).toEqual({ move: CUES.slew, focus: CUES.focus, sharp: CUES.open });
    expect(slewBeats('brisk').sharp).toBeCloseTo(CUES.open / 2);
  });
});

describe('slewHeading', () => {
  it('goes right onwards and left back, tilted by no more than 20°, the same for a slot every time', () => {
    for (let slot = 0; slot < 60; slot++) {
      const on = slewHeading(slot, false), back = slewHeading(slot, true);
      expect(on.dx).toBeGreaterThan(0.9);
      expect(back.dx).toBeLessThan(-0.9);
      expect(Math.hypot(on.dx, on.dy)).toBeCloseTo(1, 9);
      expect(slewHeading(slot, false)).toEqual(on);
    }
    expect(new Set(Array.from({ length: 7 }, (_, s) => slewHeading(s, false).angle)).size).toBeGreaterThan(3);
  });

  it('travels far enough for the old sky to leave the board', () => {
    expect(slewDistance({ dx: 1, dy: 0, angle: 0 }, 400, 300)).toBeGreaterThan(400);
    expect(slewDistance({ dx: 0, dy: 1, angle: 90 }, 400, 300)).toBeGreaterThan(300);
  });
});

describe('fieldStars', () => {
  it('lies between the two skies and is the same for a slot every time', () => {
    const field = fieldStars(3);
    expect(field).toEqual(fieldStars(3));
    expect(field).not.toEqual(fieldStars(4));
    for (const s of field) {
      expect(s.u).toBeGreaterThan(0);
      expect(s.u).toBeLessThan(1);
    }
  });
});
