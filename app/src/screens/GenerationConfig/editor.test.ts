import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE, parseSchedule } from '../../domain/generation';
import { editorReducer, initialEditor, tabConstraints, tabParams } from './editor';

describe('generation config editor', () => {
  it('starts on site 1 of the default, untouched', () => {
    const s = initialEditor();
    expect(s.schedule).toBe(DEFAULT_SCHEDULE);
    expect(tabParams(s).size).toBe(DEFAULT_SCHEDULE.sites[0].size);
    expect(tabConstraints(s)).toEqual(DEFAULT_SCHEDULE.sites[0].constraints);
    expect(s.dirty).toBe(false);
  });

  it('edits only the open site', () => {
    let s = editorReducer(initialEditor(), { type: 'tab', tab: 3 });
    s = editorReducer(s, { type: 'params', action: { type: 'set', patch: { size: 16, crossings: true } } });
    expect(s.schedule.sites[3]).toEqual({ size: 16, diff: 2, options: { budgetMs: 400, crossings: true } });
    expect(s.schedule.sites.filter((_, i) => i !== 3)).toEqual(DEFAULT_SCHEDULE.sites.filter((_, i) => i !== 3));
    expect(s.dirty).toBe(true);
    expect(parseSchedule(s.schedule).ok).toBe(true);
  });

  it('keeps a site\'s constraints through a params edit, and edits them on their own', () => {
    let s = editorReducer(initialEditor(), { type: 'params', action: { type: 'set', patch: { diff: 2 } } });
    expect(s.schedule.sites[0].constraints).toEqual(DEFAULT_SCHEDULE.sites[0].constraints);
    s = editorReducer(s, { type: 'constraints', patch: { maxK: 3, hasDegree: null } });
    expect(s.schedule.sites[0].constraints).toEqual({ minNodes: 4, maxK: 3 });
    s = editorReducer(s, { type: 'constraints', patch: { maxK: null, minNodes: null } });
    expect(s.schedule.sites[0]).not.toHaveProperty('constraints');
  });

  it('edits the fallback, which has no constraints', () => {
    let s = editorReducer(initialEditor(), { type: 'tab', tab: 'fallback' });
    expect(tabParams(s).diff).toBe(1);
    s = editorReducer(s, { type: 'params', action: { type: 'set', patch: { diff: 2 } } });
    expect(s.schedule.fallback).toEqual({ diff: 2, options: { budgetMs: 900 } });
    expect(editorReducer(s, { type: 'constraints', patch: { maxK: 1 } })).toBe(s);
  });

  it('loads a schedule over the draft and marks a save', () => {
    let s = editorReducer(initialEditor(), { type: 'retries', value: 3 });
    expect(s.schedule.retries).toBe(3);
    s = editorReducer(s, { type: 'tab', tab: 2 });
    s = editorReducer(s, { type: 'load', schedule: DEFAULT_SCHEDULE, basis: 'day 9' });
    expect(s).toEqual({ schedule: DEFAULT_SCHEDULE, tab: 2, basis: 'day 9', dirty: false });
    s = editorReducer(editorReducer(s, { type: 'retries', value: 4 }), { type: 'saved', basis: 'day 10' });
    expect(s.dirty).toBe(false);
    expect(s.basis).toBe('day 10');
  });
});
