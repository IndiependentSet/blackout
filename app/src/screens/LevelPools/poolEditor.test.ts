import { describe, expect, it } from 'vitest';
import { DEFAULT_CURVES } from '../../domain/generation';
import { initialPoolEditor, poolEditorReducer } from './poolEditor';

describe('poolEditorReducer', () => {
  const start = initialPoolEditor('survival');

  it('starts clean on the mode default, and switching mode starts over', () => {
    expect(start.curve).toBe(DEFAULT_CURVES.survival);
    expect(start.dirty).toBe(false);
    const edited = poolEditorReducer(start, { type: 'meta', patch: { seed: 9 } });
    expect(poolEditorReducer(edited, { type: 'mode', mode: 'match' })).toEqual(initialPoolEditor('match'));
  });

  it('edits one tier and marks the draft dirty', () => {
    const s = poolEditorReducer(start, { type: 'tier', index: 1, patch: { size: 12, diff: 3 } });
    expect(s.curve.tiers[1]).toMatchObject({ size: 12, diff: 3 });
    expect(s.curve.tiers[0]).toEqual(start.curve.tiers[0]);
    expect(s.dirty).toBe(true);
  });

  it('keeps every number inside its limits', () => {
    const s = poolEditorReducer(start, { type: 'tier', index: 0, patch: { count: 9999, size: 1, diff: 7 } });
    expect(s.curve.tiers[0]).toMatchObject({ count: 400, diff: 3 });
    expect(s.curve.tiers[0].size).toBeGreaterThanOrEqual(2);
    expect(poolEditorReducer(start, { type: 'meta', patch: { retries: 0 } }).curve.retries).toBe(1);
  });

  it('adds a tier like the last one, removes one, but never the last', () => {
    const added = poolEditorReducer(start, { type: 'addTier' });
    expect(added.curve.tiers).toHaveLength(start.curve.tiers.length + 1);
    expect(added.curve.tiers.at(-1)).toEqual(start.curve.tiers.at(-1));
    const one = initialPoolEditor('match');
    let s = poolEditorReducer(one, { type: 'removeTier', index: 0 });
    expect(s.curve.tiers).toHaveLength(1);
    s = poolEditorReducer(s, { type: 'removeTier', index: 0 });
    expect(s.curve.tiers).toHaveLength(1);
  });
});
