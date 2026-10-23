import { parseShape, type Recipe, type Shape } from '../../domain/generation';
import { logger } from '../logger';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { isMissingTable, toResult } from '../supabase/guard';

/* The shared generator recipes (public.generation_recipes): the shape of a sky, saved under a name. Read by the admin
   pages only — the game never does, since applying a recipe copies it into a schedule or curve. Written only through
   the admin-checked functions in app/sql/…-generation-recipes.sql. */

interface Row { name: string; shape: unknown; note: string | null }

/** Every recipe, by name. A stored shape that no longer parses is left out (and logged) rather than offered. A missing
    table reads as none: a deploy can go live a minute before its migration lands. */
export async function listRecipes(): Promise<Result<Recipe[]>> {
  const { data, error } = await supabase.from('generation_recipes').select('name, shape, note').order('name');
  if (isMissingTable(error)) return ok([]);
  const res = toResult('listRecipes', (data || []) as Row[], error);
  if (!res.ok) return res;
  const recipes: Recipe[] = [];
  for (const r of res.data) {
    const shape = parseShape(r.shape);
    if (shape.ok) recipes.push({ name: r.name, shape: shape.value, note: r.note ?? '' });
    else logger.error('listRecipes', { message: `recipe ${r.name} has a shape that does not parse: ${shape.errors.join('; ')}` });
  }
  return ok(recipes);
}

/** Save a recipe, replacing the one of that name. */
export async function saveRecipe(name: string, shape: Shape, note: string): Promise<Result<null>> {
  const { error } = await supabase.rpc('save_generation_recipe', { p_name: name.trim(), p_shape: shape, p_note: note });
  return toResult('saveRecipe', null, error);
}

/** Delete a recipe; the skies and tiers it was applied to keep their copy. */
export async function deleteRecipe(name: string): Promise<Result<null>> {
  const { error } = await supabase.rpc('delete_generation_recipe', { p_name: name });
  return toResult('deleteRecipe', null, error);
}
