import { describe, expect, it } from 'vitest';
import { scoreRun } from '../../domain/scoring';
import { bestNote, cardTitle, saveNote, signed, skipSave } from './scoreCopy';

const perfect = scoreRun({ stars: 3, k: 4 }, 4);
const over = scoreRun({ stars: 3, k: 4 }, 5);

describe('score card copy', () => {
  it('titles by status', () => {
    expect(cardTitle(perfect)).toBe('SITE CLEARED');
    expect(cardTitle(over)).toBe('CLEARED — OVER BUDGET');
  });
  it('holds the best-score note until the count-up lands', () => {
    expect(bestNote(perfect, 0, false)).toBe('');
    expect(bestNote(perfect, 0, true)).toBe('FLAWLESS. THE CLIENT IS WEEPING.');
    expect(bestNote(over, 0, true)).toBe('PERFECT RUN PAYS 30');
  });
  it('compares with the previous best', () => {
    expect(bestNote(perfect, 25, true)).toBe('NEW BEST — BEAT 25');
    expect(bestNote(over, 30, true)).toBe('BEST STANDS AT 30');
  });
  it('words the save status', () => {
    expect(saveNote(null)).toBe('');
    expect(saveNote({ kind: 'saved' })).toBe('SAVED TO YOUR LEDGER');
    expect(saveNote({ kind: 'anon' })).toBe('SIGN IN TO SAVE YOUR SCORE');
    expect(saveNote({ kind: 'error', message: 'boom' })).toBe('SCORE NOT SAVED — boom');
    expect(saveNote({ kind: 'offSchedule' })).toBe('OFF-SCHEDULE: NOT ON THE BOARD');
  });
  it('only records a signed-in clear of an on-schedule level', () => {
    expect(skipSave('u', true)).toBeNull();
    expect(skipSave(null, true)).toEqual({ kind: 'anon' });
    expect(skipSave('u', false)).toEqual({ kind: 'offSchedule' });
    expect(skipSave(null, false)).toEqual({ kind: 'offSchedule' });
  });
  it('signs row values', () => {
    expect(signed(30)).toBe('+30');
    expect(signed(0)).toBe('0');
    expect(signed(-5)).toBe('-5');
  });
});
