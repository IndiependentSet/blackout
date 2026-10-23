/* The recipes page's draft: the recipe open (or a new one), its name and note, and the settings panel's params. Only
   the params' shape is the recipe; their seed, size and difficulty pick the preview and survive opening another. Pure. */
import { shapeOf, type Recipe, type Shape } from '../../domain/generation';
import { DEFAULT_PARAMS, paramsReducer, siteToParams, toGenOptions, type ParamsAction, type PlaygroundParams } from '../Playground/params';

export interface RecipeEditor {
  /** the saved recipe being edited, or null for a new one */
  open: string | null;
  name: string;
  note: string;
  params: PlaygroundParams;
  dirty: boolean;
}

export type RecipeEditorAction =
  | { type: 'new' }
  | { type: 'open'; recipe: Recipe }
  | { type: 'name'; value: string }
  | { type: 'note'; value: string }
  | { type: 'params'; action: ParamsAction }
  | { type: 'saved'; name: string };

/** what a new recipe previews at: a mid-sized, two-star sky */
const PREVIEW: PlaygroundParams = { ...DEFAULT_PARAMS, size: 16, diff: 2 };

export const initialRecipeEditor = (): RecipeEditor => ({ open: null, name: '', note: '', params: PREVIEW, dirty: false });

/** The shape the draft would save. */
export const draftShape = (s: RecipeEditor): Shape => shapeOf(toGenOptions(s.params));

export function recipeEditorReducer(s: RecipeEditor, a: RecipeEditorAction): RecipeEditor {
  const { seed, size, diff } = s.params;
  switch (a.type) {
    case 'new': return { ...initialRecipeEditor(), params: { ...PREVIEW, seed, size, diff } };
    case 'open': return {
      open: a.recipe.name, name: a.recipe.name, note: a.recipe.note, dirty: false,
      params: { ...siteToParams({ size, diff: 2, options: a.recipe.shape }, seed), diff, clock: false },
    };
    case 'name': return { ...s, name: a.value, dirty: true };
    case 'note': return { ...s, note: a.value, dirty: true };
    case 'params': {
      const params = paramsReducer(s.params, a.action);
      /* seed, size and difficulty are only the preview: turning them is not an edit */
      const edited = JSON.stringify(shapeOf(toGenOptions(params))) !== JSON.stringify(draftShape(s));
      return { ...s, params, dirty: s.dirty || edited };
    }
    case 'saved': return { ...s, open: a.name, name: a.name, dirty: false };
  }
}
