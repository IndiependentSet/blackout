import { logger } from '../logger';
import { fail, ok, type Result } from '../result';

interface DbError { message: string; code?: string }

/** Turn a Supabase `{ data, error }` pair into a Result, logging failures once. */
export function toResult<T>(scope: string, data: T, error: DbError | null): Result<T> {
  if (error) {
    logger.error(scope, error);
    return fail(error.message);
  }
  return ok(data);
}

/** Postgres unique_violation. */
export const UNIQUE_VIOLATION = '23505';

/** The table doesn't exist (yet): Postgres undefined_table, or PostgREST's
    "not in the schema cache", which is how a missing table reaches the client. */
export const isMissingTable = (error: DbError | null): boolean =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205');
