import { describe, expect, it } from 'vitest';
import { draftShape, initialRecipeEditor, recipeEditorReducer, type RecipeEditor, type RecipeEditorAction } from './recipeEditor';

const run = (s: RecipeEditor, ...actions: RecipeEditorAction[]) => actions.reduce(recipeEditorReducer, s);
const open = { name: 'Open field', shape: { strategy: 'free' as const, density: 1.6 }, note: 'busy skies' };

describe('recipeEditorReducer', () => {
  it('opens a recipe as its shape, keeping the preview the admin had', () => {
    const s = run(initialRecipeEditor(), { type: 'params', action: { type: 'set', patch: { seed: 9, size: 30 } } }, { type: 'open', recipe: open });
    expect(s).toMatchObject({ open: 'Open field', name: 'Open field', note: 'busy skies', dirty: false });
    expect(s.params).toMatchObject({ seed: 9, size: 30, strategy: 'free', density: 1.6 });
    expect(draftShape(s)).toEqual(open.shape);
  });

  it('counts a shape change as an edit, but not turning the preview', () => {
    const s = run(initialRecipeEditor(), { type: 'open', recipe: open });
    expect(run(s, { type: 'params', action: { type: 'set', patch: { seed: 4, size: 12, diff: 3 } } }).dirty).toBe(false);
    const edited = run(s, { type: 'params', action: { type: 'set', patch: { girth: 4 } } });
    expect(edited.dirty).toBe(true);
    expect(draftShape(edited)).toEqual({ ...open.shape, girth: 4 });
    /* the hardness and search knobs are not part of a recipe */
    expect(draftShape(run(s, { type: 'params', action: { type: 'set', patch: { greedyMustFail: true, budgetMs: 50 } } }))).toEqual(open.shape);
  });

  it('starts a new recipe from the default shape, and a save makes it the open one', () => {
    const s = run(initialRecipeEditor(), { type: 'open', recipe: open }, { type: 'new' });
    expect(s).toMatchObject({ open: null, name: '', dirty: false });
    expect(draftShape(s)).toEqual({});
    expect(run(s, { type: 'name', value: 'Plain' }, { type: 'saved', name: 'Plain' })).toMatchObject({ open: 'Plain', dirty: false });
  });
});
