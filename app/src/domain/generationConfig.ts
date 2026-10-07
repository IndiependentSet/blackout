/* Admin-saved generation configs: which one is in force on a day, and what
   schedule the game runs from it. The stored schedule is untrusted JSON, so it
   always goes through parseSchedule; anything that doesn't parse falls back
   to the default. Pure. */
import { DEFAULT_SCHEDULE, parseSchedule, resolveOptions, type GenerationSchedule } from './generation';
import type { GameMode } from './gameModes';

export interface StoredConfig {
  id: number;
  mode: GameMode;
  /** the first puzzle day this config makes */
  effectiveFromDay: number;
  /** as stored: not yet checked */
  schedule: unknown;
  note: string;
  createdAt: string;
}

/** saved: a stored config is in force; default: none is; invalid: one is, but it doesn't parse */
export type ScheduleSource = 'saved' | 'default' | 'invalid';

export interface ResolvedSchedule {
  schedule: GenerationSchedule;
  source: ScheduleSource;
  /** why a stored config was ignored (source 'invalid') */
  errors: string[];
}

/** The config in force on `day`: the latest one that has taken effect by then. */
export function configForDay(rows: readonly StoredConfig[], day: number): StoredConfig | null {
  let best: StoredConfig | null = null;
  for (const r of rows) {
    if (r.effectiveFromDay <= day && (!best || r.effectiveFromDay > best.effectiveFromDay)) best = r;
  }
  return best;
}

/** What the game asks of a schedule beyond what the generator accepts: every
    level keeps a unique optimal cover (the puzzle is deduced, not guessed, and
    the INSIDER hint assumes one answer). Relaxing that is a product decision,
    not a setting, so only the playground may. */
export function gameRuleErrors(schedule: GenerationSchedule): string[] {
  const rules = [
    ...schedule.sites.map((s, i) => ({ path: `schedule.sites[${i}].options`, options: s.options })),
    { path: 'schedule.fallback.options', options: schedule.fallback.options },
  ];
  return rules
    .filter(r => resolveOptions(r.options).maxOptima !== 1)
    .map(r => `${r.path}.maxOptima: the game needs a unique optimal cover (1)`);
}

/** Check untrusted JSON as a schedule the game can run: parseSchedule, then the game's own rules. */
export function checkGameSchedule(raw: unknown): { ok: true; value: GenerationSchedule } | { ok: false; errors: string[] } {
  const parsed = parseSchedule(raw);
  if (!parsed.ok) return parsed;
  const errors = gameRuleErrors(parsed.value);
  return errors.length ? { ok: false, errors } : parsed;
}

/** The schedule a stored config (or none) makes the game run. */
export function resolveSchedule(row: StoredConfig | null): ResolvedSchedule {
  if (!row) return { schedule: DEFAULT_SCHEDULE, source: 'default', errors: [] };
  const checked = checkGameSchedule(row.schedule);
  return checked.ok
    ? { schedule: checked.value, source: 'saved', errors: [] }
    : { schedule: DEFAULT_SCHEDULE, source: 'invalid', errors: checked.errors };
}

/** The first day a config saved today may take effect: today's puzzles never change. */
export const earliestEffectiveDay = (today: number): number => today + 1;

export type ConfigStatus = 'past' | 'inForce' | 'scheduled';

/** Where a stored config stands on `today`, among all the configs for its mode. */
export function configStatus(row: StoredConfig, rows: readonly StoredConfig[], today: number): ConfigStatus {
  if (row.effectiveFromDay > today) return 'scheduled';
  return configForDay(rows, today)?.id === row.id ? 'inForce' : 'past';
}
