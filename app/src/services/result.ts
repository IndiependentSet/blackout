/** The one shape every service call returns: no throwing, no ad-hoc `{ error }` objects. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: string): Result<never> => ({ ok: false, error });

/** Unwrap with a fallback, for callers that treat a failure as "nothing there". */
export const dataOr = <T>(r: Result<T>, fallback: T): T => (r.ok ? r.data : fallback);
