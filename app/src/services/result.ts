/** The one shape every service call returns: no throwing, no ad-hoc `{ error }` objects. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: string): Result<never> => ({ ok: false, error });

/** Unwrap with a fallback, for callers that treat a failure as "nothing there". */
export const dataOr = <T>(r: Result<T>, fallback: T): T => (r.ok ? r.data : fallback);

/** A Result that gives up with `fail('timed out')` after `ms`, for reads the UI won't wait on forever. */
export function withTimeout<T>(p: Promise<Result<T>>, ms: number): Promise<Result<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<Result<T>>(resolve => { timer = setTimeout(() => resolve(fail('timed out')), ms); });
  return Promise.race([p, late]).finally(() => clearTimeout(timer));
}
