import { useReducer, useState } from 'react';
import { describeShape, recipeNameError } from '../../domain/generation';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { deleteRecipe, saveRecipe } from '../../services/repositories/recipes';
import { Button } from '../../themes/stargazer/kit/Button';
import { cx } from '../../themes/stargazer/kit/cx';
import { Note } from '../../themes/stargazer/kit/Page';
import { Info } from '../Playground/Info';
import { ParamsPanel } from '../Playground/ParamsPanel';
import { encodeParams } from '../Playground/params';
import { RecipePreview } from './RecipePreview';
import { draftShape, initialRecipeEditor, recipeEditorReducer } from './recipeEditor';
import { useRecipes } from './useRecipes';
import pg from '../Playground/Playground.module.css';
import styles from './Recipes.module.css';

/* UI-only randomness: picking the next preview seed, never inside generation */
const randomSeed = () => Math.floor(Math.random() * 1e6);

/** Admin-only: the shared recipes. Edit a shape with the settings panel and watch it grow in the preview; save it
    under a name for the Tonight and pool pages to apply. */
export function RecipesScreen() {
  const recipes = useRecipes();
  const [state, dispatch] = useReducer(recipeEditorReducer, undefined, initialRecipeEditor);
  const [write, setWrite] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  useUnsavedGuard(state.dirty);
  const list = recipes.data ?? [];

  /* the first time the list arrives, open the first recipe, unless editing has begun */
  const [started, setStarted] = useState(false);
  if (recipes.data && !started) {
    setStarted(true);
    if (recipes.data[0] && !state.dirty) dispatch({ type: 'open', recipe: recipes.data[0] });
  }

  const name = state.name.trim();
  const nameError = name ? recipeNameError(name) : null;
  const replaces = name !== state.open && list.some(r => r.name === name);
  const save = async () => {
    if (!name || nameError) return;
    if (replaces && !window.confirm(`A recipe called “${name}” exists. Replace it with this shape?`)) return;
    setWrite({ busy: true, error: null });
    const r = await saveRecipe(name, draftShape(state), state.note.trim());
    setWrite({ busy: false, error: r.ok ? null : r.error });
    if (r.ok) { dispatch({ type: 'saved', name }); recipes.reload(); }
  };
  const remove = async () => {
    const open = state.open;
    if (!open || !window.confirm(`Delete the recipe “${open}”? Skies and tiers it was applied to keep their copy.`)) return;
    setWrite({ busy: true, error: null });
    const r = await deleteRecipe(open);
    setWrite({ busy: false, error: r.ok ? null : r.error });
    if (r.ok) { dispatch({ type: 'new' }); recipes.reload(); }
  };
  const leave = (go: () => void) => { if (!state.dirty || window.confirm('Drop the changes to this recipe?')) go(); };

  return (
    <div className={pg.page}>
      <header className={pg.header}>
        <div className={styles.title}>
          <span className={styles.eyebrow}>How levels are made</span>
          <h1>Recipes</h1>
        </div>
        <span className={pg.hint}>A recipe is the shape of a sky. Apply it on Tonight or a pool page; it is copied in, never linked.</span>
      </header>
      <div className={pg.layout}>
        <div className={styles.left}>
          <ParamsPanel p={state.params} dispatch={action => dispatch({ type: 'params', action })} use="recipe"
            onReroll={() => dispatch({ type: 'params', action: { type: 'set', patch: { seed: randomSeed() } } })} />
        </div>
        <main className={pg.main}><RecipePreview params={state.params} /></main>
        <div className={styles.side}>
          <div className={pg.panel}>
            <section>
              <h3>{state.open ? 'Editing' : 'New recipe'} <Info k="recipe" /></h3>
              <label className={styles.field}>Name
                <input value={state.name} maxLength={40} placeholder="e.g. Open field" onChange={e => dispatch({ type: 'name', value: e.target.value })} />
              </label>
              <label className={styles.field}>What it is for
                <input value={state.note} maxLength={200} placeholder="busy skies, no gadgets" onChange={e => dispatch({ type: 'note', value: e.target.value })} />
              </label>
              <div className={styles.current}><b>Shape</b><span>{describeShape(draftShape(state))}</span></div>
              {nameError && <p className={pg.warn}>{nameError}</p>}
              <div className={styles.actions}>
                <Button size="xs" kind="primary" disabled={!name || !!nameError || write.busy || (!state.dirty && state.open === name)} onClick={() => void save()}>
                  {write.busy ? 'Saving…' : state.open && name !== state.open ? `Save as “${name}”` : 'Save'}
                </Button>
                {state.open && <Button size="xs" kind="outline" disabled={write.busy} onClick={() => void remove()}>Delete</Button>}
                <a className={pg.link} href={'/playground.html#' + encodeParams(state.params)}>Open in Playground</a>
              </div>
              {state.dirty && <p className={styles.dirty}>Unsaved changes</p>}
              {write.error && <p className={pg.warn} role="alert">{write.error}</p>}
            </section>
          </div>
          <div className={pg.panel}>
            <section>
              <h3>All recipes</h3>
              {recipes.error ? <Note tone="error">{recipes.error}</Note>
                : recipes.loading ? <p className={pg.muted}>Loading…</p>
                  : !list.length ? <Note>No recipes yet. Shape one on the left and save it.</Note>
                    : <ul className={styles.list}>
                        {list.map(r => (
                          <li key={r.name}>
                            <button type="button" className={cx(styles.item, r.name === state.open && styles.itemOpen)}
                              aria-current={r.name === state.open ? 'true' : undefined} onClick={() => leave(() => dispatch({ type: 'open', recipe: r }))}>
                              <b>{r.name}</b><span>{describeShape(r.shape)}</span>{r.note && <span>{r.note}</span>}
                            </button>
                          </li>
                        ))}
                      </ul>}
              <div className={styles.actions}>
                <Button size="xs" kind="soft" onClick={() => leave(() => dispatch({ type: 'new' }))}>+ New recipe</Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
