import { describe, expect, it } from 'vitest';
import { DEFAULT_GEN } from './options';
import { describeShape, parseShape, recipeFor, recipeNameError, sameShape, shapeOf, withShape, type Recipe } from './recipe';

const free: Recipe = { name: 'Open field', shape: { strategy: 'free', density: 1.6, maxDegree: 4 }, note: '' };
const tight: Recipe = { name: 'No triangles', shape: { girth: 4 }, note: '' };

describe('recipes', () => {
  it('a shape keeps only the shape keys that differ from the defaults', () => {
    expect(shapeOf({ strategy: 'free', density: 1.6, budgetMs: 2000, greedyMustFail: true, maxDegree: DEFAULT_GEN.maxDegree }))
      .toEqual({ strategy: 'free', density: 1.6 });
    expect(shapeOf({})).toEqual({});
  });

  it('applying a shape replaces every shape key and keeps the rest of the rule', () => {
    const tier = { strategy: 'free' as const, density: 2, budgetMs: 3000, minBoundGap: 2 };
    expect(withShape(tier, tight.shape)).toEqual({ budgetMs: 3000, minBoundGap: 2, girth: 4 });
    expect(withShape({ budgetMs: 800 }, free.shape)).toEqual({ budgetMs: 800, ...free.shape });
  });

  it('finds the recipe a rule uses by its shape, and none once it is edited', () => {
    const tier = withShape({ budgetMs: 2000, greedyMustFail: true }, free.shape);
    expect(sameShape(tier, free.shape)).toBe(true);
    expect(recipeFor(tier, [tight, free])?.name).toBe('Open field');
    expect(recipeFor({ ...tier, density: 1.8 }, [tight, free])).toBeNull();
    /* the default shape is a recipe like any other */
    expect(recipeFor({ budgetMs: 400 }, [{ name: 'Plain', shape: {}, note: '' }])?.name).toBe('Plain');
  });

  it('checks a stored shape like any options, and refuses what belongs to the tier', () => {
    expect(parseShape({ strategy: 'free', density: 1.6 })).toEqual({ ok: true, value: { strategy: 'free', density: 1.6 } });
    const tierOnly = parseShape({ strategy: 'free', budgetMs: 100 });
    expect(tierOnly.ok).toBe(false);
    expect(parseShape({ density: 99 }).ok).toBe(false);
    expect(parseShape('free').ok).toBe(false);
  });

  it('names and describes recipes', () => {
    expect(recipeNameError('  ')).toBeTruthy();
    expect(recipeNameError('x'.repeat(41))).toBeTruthy();
    expect(recipeNameError('Open field')).toBeNull();
    expect(describeShape(free.shape)).toBe('free · maxDegree 4 · density 1.6');
    expect(describeShape({})).toBe('gadgets');
    expect(describeShape({ menu: ['spur'] })).toBe('gadgets · custom mix');
  });
});
