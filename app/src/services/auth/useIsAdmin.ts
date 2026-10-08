import { useCallback } from 'react';
import { useResource } from '../../hooks/useResource';
import { isAdmin } from '../repositories/admin';

export interface AdminCheck {
  /** null until the answer arrives (and for a signed-out visitor, false) */
  admin: boolean | null;
  error: string | null;
}

/* Whether this user may open the admin pages. Only decides what is shown:
   every admin write is checked again in Postgres. */
export function useIsAdmin(userId: string | null): AdminCheck {
  const load = useCallback(() => isAdmin(userId), [userId]);
  const res = useResource(userId ? 'admin:' + userId : null, load);
  if (!userId) return { admin: false, error: null };
  return { admin: res.data ?? null, error: res.error };
}
