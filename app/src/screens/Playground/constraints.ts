/* A rule's level constraints, edited a field at a time. Pure. */
import type { LevelConstraints, SiteRule } from '../../domain/generation';

/** A rule's constraints with a patch applied: a number sets one, null turns it off; none left drops the field. */
export function mergeConstraints<R extends Pick<SiteRule, 'constraints'>>(rule: R, patch: Partial<Record<keyof LevelConstraints, number | null>>): R {
  const merged: Record<string, number | null | undefined> = { ...rule.constraints, ...patch };
  const constraints = Object.fromEntries(Object.entries(merged).filter(([, v]) => typeof v === 'number')) as LevelConstraints;
  const { constraints: _old, ...rest } = rule;
  return (Object.keys(constraints).length ? { ...rest, constraints } : rest) as R;
}
