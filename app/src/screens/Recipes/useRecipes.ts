import { useResource, type Resource } from '../../hooks/useResource';
import { listRecipes } from '../../services/repositories/recipes';
import type { Recipe } from '../../domain/generation';

/** The shared recipes, for any admin page; `reload` after a save or delete. */
export const useRecipes = (): Resource<Recipe[]> => useResource('recipes', listRecipes);
