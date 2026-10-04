import { describe, expect, it } from 'vitest';
import { keyAction } from './keymap';

describe('keyAction', () => {
  it('maps letters regardless of case', () => {
    expect(keyAction('r')).toEqual({ type: 'recall' });
    expect(keyAction('R')).toEqual({ type: 'recall' });
    expect(keyAction('D')).toEqual({ type: 'dim' });
  });
  it('maps zoom keys', () => {
    expect(keyAction('+')).toEqual({ type: 'zoom', by: 1.25 });
    expect(keyAction('=')).toEqual({ type: 'zoom', by: 1.25 });
    expect(keyAction('-')).toEqual({ type: 'zoom', by: 0.8 });
  });
  it('maps hints, activate and arrows', () => {
    expect(keyAction('2')).toEqual({ type: 'consult', tier: 2 });
    expect(keyAction(' ')).toEqual({ type: 'activate' });
    expect(keyAction('Enter')).toEqual({ type: 'activate' });
    expect(keyAction('ArrowLeft')).toEqual({ type: 'move', dir: 'ArrowLeft' });
  });
  it('ignores everything else — including multi-letter keys that start with a mapped letter', () => {
    expect(keyAction('x')).toBeNull();
    expect(keyAction('4')).toBeNull();
    expect(keyAction('Escape')).toBeNull();
    expect(keyAction('End')).toBeNull();     // starts with "e"
    expect(keyAction('Delete')).toBeNull();  // starts with "d"
  });
});
