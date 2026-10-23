import { useState } from 'react';
import { describeShape, recipeFor, recipeNameError, shapeOf, type GenOptions, type Recipe, type Shape } from '../../domain/generation';
import type { Resource } from '../../hooks/useResource';
import { saveRecipe } from '../../services/repositories/recipes';
import { Button } from '../../themes/stargazer/kit/Button';
import { Info } from '../Playground/Info';
import pg from '../Playground/Playground.module.css';
import styles from './Recipes.module.css';

/** What Apply can reach besides the open rule: the open sky or tier, among how many, and what to call them. */
export interface ApplyRange { unit: 'sky' | 'tier'; index: number; count: number }

interface Props {
  /** the open rule's options */
  options: Partial<GenOptions>;
  recipes: Resource<Recipe[]>;
  /** null: Apply only changes the open rule (the fallback, the playground) */
  range: ApplyRange | null;
  /** apply a shape to the open rule (range null) or to rules from..to, zero-based */
  onApply: (shape: Shape, range: { from: number; to: number } | null) => void;
}

/** The recipe the open rule matches, applying one (to it, or to a run of skies or tiers), and saving its shape as a
    recipe. Every admin page that edits a rule shows this above the settings panel. Mount it with `key` set to the
    open rule, so the range starts on it. */
export function RecipeBar({ options, recipes, range, onApply }: Props) {
  const list = recipes.data ?? [];
  const matched = recipeFor(options, list);
  const [pick, setPick] = useState('');
  const [from, setFrom] = useState(range ? range.index + 1 : 1);
  const [to, setTo] = useState(range ? range.index + 1 : 1);
  const [naming, setNaming] = useState<string | null>(null);
  const [write, setWrite] = useState<{ busy: boolean; error: string | null; saved: string | null }>({ busy: false, error: null, saved: null });

  const chosen = list.find(r => r.name === pick) ?? null;
  const apply = () => {
    if (!chosen) return;
    onApply(chosen.shape, range ? { from: from - 1, to: to - 1 } : null);
  };
  const save = async () => {
    const name = (naming ?? '').trim();
    const bad = recipeNameError(name);
    if (bad) { setWrite({ busy: false, error: bad, saved: null }); return; }
    if (list.some(r => r.name === name) && !window.confirm(`Replace the recipe “${name}” with this shape?`)) return;
    setWrite({ busy: true, error: null, saved: null });
    const r = await saveRecipe(name, shapeOf(options), list.find(x => x.name === name)?.note ?? '');
    setWrite({ busy: false, error: r.ok ? null : r.error, saved: r.ok ? name : null });
    if (r.ok) { setNaming(null); recipes.reload(); }
  };
  const unit = range?.unit === 'sky' ? 'skies' : 'tiers';

  return (
    <div className={pg.panel}>
      <section>
        <h3>Recipe <Info k="recipe" /></h3>
        <div className={styles.current}>
          <b>{matched ? matched.name : 'Custom shape'}</b>
          <span>{describeShape(shapeOf(options))}</span>
        </div>
        {recipes.error && <p className={pg.warn}>{recipes.error}</p>}
        <div className={styles.applyRow}>
          <select aria-label="recipe to apply" value={pick} onChange={e => setPick(e.target.value)} disabled={!list.length}>
            <option value="">{list.length ? 'Choose a recipe…' : recipes.loading ? 'Loading recipes…' : 'No recipes yet'}</option>
            {list.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
          <Button size="xs" kind="mint" disabled={!chosen} onClick={apply}>Apply</Button>
        </div>
        {range && (
          <div className={styles.applyRow}>
            <span>to {unit}</span>
            <input className={pg.num} type="number" aria-label={`first of the ${unit}`} min={1} max={range.count} value={from}
              onChange={e => setFrom(Math.min(range.count, Math.max(1, Math.round(Number(e.target.value)) || 1)))} />
            <span>–</span>
            <input className={pg.num} type="number" aria-label={`last of the ${unit}`} min={1} max={range.count} value={to}
              onChange={e => setTo(Math.min(range.count, Math.max(1, Math.round(Number(e.target.value)) || 1)))} />
            <Info k="applyRange" />
          </div>
        )}
        {chosen?.note && <p className={pg.muted}>{chosen.note}</p>}
        {naming === null
          ? <div className={styles.links}>
              <button type="button" className={pg.link} onClick={() => { setNaming(matched?.name ?? ''); setWrite({ busy: false, error: null, saved: null }); }}>
                Save this shape as a recipe
              </button>
              <a className={pg.link} href="/recipes.html">Manage recipes</a>
            </div>
          : <form className={styles.applyRow} onSubmit={e => { e.preventDefault(); void save(); }}>
              <input className={styles.name} aria-label="recipe name" placeholder="Name, e.g. Open field" value={naming}
                maxLength={40} onChange={e => setNaming(e.target.value)} autoFocus />
              <Button size="xs" kind="primary" type="submit" disabled={write.busy}>{write.busy ? 'Saving…' : 'Save'}</Button>
              <Button size="xs" kind="ghost" type="button" onClick={() => setNaming(null)}>Cancel</Button>
            </form>}
        {write.error && <p className={pg.warn} role="alert">{write.error}</p>}
        {write.saved && <p className={styles.ok}>Saved as “{write.saved}”.</p>}
      </section>
    </div>
  );
}
